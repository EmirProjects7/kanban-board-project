import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, act, waitFor} from '@testing-library/react'
import {useBoard} from '../hooks/useBoard'

const {apiMock, socketMock} = vi.hoisted(() => ({
    apiMock: {
        fetchColumns: vi.fn(),
        createCard: vi.fn(),
        deleteCard: vi.fn(),
        updateCard: vi.fn(),
        createColumn: vi.fn(),
        deleteColumn: vi.fn(),
        saveBoard: vi.fn(),
    },
    socketMock: {on: vi.fn(), off: vi.fn()},
}))

vi.mock('../api', () => apiMock)
vi.mock('../socket', () => ({connectSocket: () => socketMock}))

const board = [
    {id: 'col-1', title: 'Todo', cards: [{id: 'card-1', title: 'Task'}]},
    {id: 'col-2', title: 'Done', cards: []},
]

beforeEach(() => {
    vi.clearAllMocks()
    apiMock.fetchColumns.mockResolvedValue(board)
})

describe('initial load', () => {
    it('does not fetch when the user is not authenticated', () => {
        renderHook(() => useBoard(false))
        expect(apiMock.fetchColumns).not.toHaveBeenCalled()
    })

    it('loads the board once authenticated', async () => {
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))
    })

    it('keeps an empty board when the fetch fails', async () => {
        apiMock.fetchColumns.mockRejectedValue(new Error('network down'))
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(apiMock.fetchColumns).toHaveBeenCalled())
        expect(result.current.columns).toEqual([])
    })
})

describe('addCard', () => {
    it('appends the created card to the right column', async () => {
        apiMock.createCard.mockResolvedValue({id: 'card-2', title: 'New'})
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await result.current.addCard('col-1', 'New')
        })

        expect(result.current.columns[0].cards).toHaveLength(2)
        expect(result.current.columns[0].cards[1].title).toBe('New')
        expect(result.current.columns[1].cards).toHaveLength(0)
    })

    it('applies two rapid adds without losing either', async () => {
        apiMock.createCard
            .mockResolvedValueOnce({id: 'card-2', title: 'First'})
            .mockResolvedValueOnce({id: 'card-3', title: 'Second'})
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await Promise.all([
                result.current.addCard('col-1', 'First'),
                result.current.addCard('col-1', 'Second'),
            ])
        })

        const titles = result.current.columns[0].cards.map((c) => c.title)
        expect(titles).toContain('First')
        expect(titles).toContain('Second')
    })
})

describe('deleteCard', () => {
    it('removes the card from state', async () => {
        apiMock.deleteCard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await result.current.deleteCard('card-1')
        })

        expect(result.current.columns[0].cards).toHaveLength(0)
    })
})

describe('editCard', () => {
    it('updates the card title in state', async () => {
        apiMock.updateCard.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await result.current.editCard('card-1', 'Renamed')
        })

        expect(result.current.columns[0].cards[0].title).toBe('Renamed')
    })
})

describe('addColumn and deleteColumn', () => {
    it('appends a created column', async () => {
        apiMock.createColumn.mockResolvedValue({id: 'col-3', title: 'Backlog', cards: []})
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await result.current.addColumn('Backlog')
        })

        expect(result.current.columns).toHaveLength(3)
    })

    it('removes a deleted column', async () => {
        apiMock.deleteColumn.mockResolvedValue(undefined)
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        await act(async () => {
            await result.current.deleteColumn('col-1')
        })

        expect(result.current.columns.map((c) => c.id)).toEqual(['col-2'])
    })
})

describe('realtime board updates', () => {
    function emitUpdate(payload: unknown) {
        const handler = socketMock.on.mock.calls.find((c) => c[0] === 'board:updated')?.[1]
        act(() => handler(payload))
    }

    it('does not subscribe when unauthenticated', () => {
        renderHook(() => useBoard(false))
        expect(socketMock.on).not.toHaveBeenCalled()
    })

    it('applies an incoming board update', async () => {
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        const incoming = [{id: 'col-9', title: 'Remote', cards: []}]
        emitUpdate(incoming)

        expect(result.current.columns).toEqual(incoming)
    })

    it('ignores an incoming update while a drag is in progress', async () => {
        const {result} = renderHook(() => useBoard(true))
        await waitFor(() => expect(result.current.columns).toEqual(board))

        result.current.isDraggingRef.current = true
        emitUpdate([{id: 'col-9', title: 'Remote', cards: []}])

        expect(result.current.columns).toEqual(board)
    })

    it('unsubscribes on unmount', async () => {
        const {unmount} = renderHook(() => useBoard(true))
        unmount()
        expect(socketMock.off).toHaveBeenCalledWith('board:updated')
    })
})
