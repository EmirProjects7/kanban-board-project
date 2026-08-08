import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, act, waitFor} from '@testing-library/react'
import {useBoards} from '../hooks/useBoards'

const {apiMock} = vi.hoisted(() => ({
    apiMock: {
        fetchBoards: vi.fn(),
        createBoard: vi.fn(),
        updateBoard: vi.fn(),
        deleteBoard: vi.fn(),
        saveBoardOrder: vi.fn(),
    },
}))

vi.mock('../api', () => apiMock)

const boards = [
    {id: 'board-1', title: 'Work', order: 0},
    {id: 'board-2', title: 'Home', order: 1},
]

beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    apiMock.fetchBoards.mockResolvedValue(boards)
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('initial load', () => {
    it('does not fetch until the user is authenticated', () => {
        renderHook(() => useBoards(false))
        expect(apiMock.fetchBoards).not.toHaveBeenCalled()
    })

    it('opens the first board when nothing was remembered', async () => {
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.activeBoardId).toBe('board-1'))
    })

    it('reopens the board that was last in view', async () => {
        localStorage.setItem('activeBoardId', 'board-2')
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.activeBoardId).toBe('board-2'))
    })

    // The board could have been deleted from another session since.
    it('falls back to the first board when the remembered one is gone', async () => {
        localStorage.setItem('activeBoardId', 'board-deleted-elsewhere')
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.activeBoardId).toBe('board-1'))
    })

    it('leaves nothing active when the account has no boards', async () => {
        apiMock.fetchBoards.mockResolvedValue([])
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(apiMock.fetchBoards).toHaveBeenCalled())
        expect(result.current.activeBoardId).toBeNull()
    })

    it('reports a failed load', async () => {
        apiMock.fetchBoards.mockRejectedValue(new Error('network down'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.error).toBe('Could not load your boards.'))
    })

    it('reports nothing at all when signed out', () => {
        const {result} = renderHook(() => useBoards(false))
        expect(result.current.boards).toEqual([])
        expect(result.current.activeBoardId).toBeNull()
    })
})

describe('selectBoard', () => {
    it('remembers the choice for the next visit', async () => {
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        act(() => result.current.selectBoard('board-2'))

        expect(result.current.activeBoardId).toBe('board-2')
        expect(localStorage.getItem('activeBoardId')).toBe('board-2')
    })
})

describe('addBoard', () => {
    it('appends the new board and opens it', async () => {
        apiMock.createBoard.mockResolvedValue({id: 'board-3', title: 'Side project', order: 2})
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.addBoard('Side project')
        })

        expect(result.current.boards.map((board) => board.id)).toEqual([
            'board-1',
            'board-2',
            'board-3',
        ])
        expect(result.current.activeBoardId).toBe('board-3')
    })

    it('surfaces a rejected create', async () => {
        apiMock.createBoard.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.addBoard('Side project')
        })

        expect(result.current.error).toBe('Could not create the board.')
    })
})

describe('renameBoard', () => {
    it('renames in place', async () => {
        apiMock.updateBoard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.renameBoard('board-2', 'Personal')
        })

        expect(result.current.boards[1].title).toBe('Personal')
        expect(result.current.boards[0].title).toBe('Work')
    })

    it('surfaces a rejected rename', async () => {
        apiMock.updateBoard.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.renameBoard('board-2', 'Personal')
        })

        expect(result.current.error).toBe('Could not rename the board.')
    })
})

describe('removeBoard', () => {
    it('moves to another board when the open one is deleted', async () => {
        apiMock.deleteBoard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.activeBoardId).toBe('board-1'))

        await act(async () => {
            await result.current.removeBoard('board-1')
        })

        expect(result.current.boards.map((board) => board.id)).toEqual(['board-2'])
        expect(result.current.activeBoardId).toBe('board-2')
        expect(localStorage.getItem('activeBoardId')).toBe('board-2')
    })

    // Deleting from the drawer should not pull the board out from under you.
    it('stays where it is when another board is deleted', async () => {
        apiMock.deleteBoard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.activeBoardId).toBe('board-1'))

        await act(async () => {
            await result.current.removeBoard('board-2')
        })

        expect(result.current.activeBoardId).toBe('board-1')
    })

    it('surfaces a rejected delete and keeps the board', async () => {
        apiMock.deleteBoard.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.removeBoard('board-1')
        })

        expect(result.current.error).toBe('Could not delete the board.')
        expect(result.current.boards).toEqual(boards)
    })
})

describe('reorderBoards', () => {
    it('applies the order before the request answers', async () => {
        let settle: () => void = () => {}
        apiMock.saveBoardOrder.mockReturnValue(
            new Promise<void>((resolve) => {
                settle = resolve
            })
        )
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        const reversed = [boards[1], boards[0]]
        let saving!: Promise<void>
        act(() => {
            saving = result.current.reorderBoards(reversed)
        })

        // The drag has to look immediate, so state moves first and the request
        // only makes it stick.
        expect(result.current.boards.map((board) => board.id)).toEqual(['board-2', 'board-1'])

        await act(async () => {
            settle()
            await saving
        })
        expect(apiMock.saveBoardOrder).toHaveBeenCalledWith(reversed)
    })

    it('surfaces a rejected save', async () => {
        apiMock.saveBoardOrder.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.reorderBoards([boards[1], boards[0]])
        })

        expect(result.current.error).toBe('Could not save the board order.')
    })
})

describe('errors', () => {
    it('clears once something succeeds', async () => {
        apiMock.updateBoard.mockRejectedValueOnce(new Error('refused'))
        apiMock.updateBoard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.renameBoard('board-1', 'One')
        })
        expect(result.current.error).toBeTruthy()

        await act(async () => {
            await result.current.renameBoard('board-1', 'Two')
        })
        expect(result.current.error).toBeNull()
    })

    it('can be dismissed', async () => {
        apiMock.updateBoard.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useBoards(true))
        await waitFor(() => expect(result.current.boards).toEqual(boards))

        await act(async () => {
            await result.current.renameBoard('board-1', 'One')
        })

        act(() => result.current.dismissError())
        expect(result.current.error).toBeNull()
    })
})
