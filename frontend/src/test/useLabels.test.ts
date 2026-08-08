import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, act, waitFor} from '@testing-library/react'
import {useLabels} from '../hooks/useLabels'

const {apiMock} = vi.hoisted(() => ({
    apiMock: {
        fetchLabels: vi.fn(),
        createLabel: vi.fn(),
        updateLabel: vi.fn(),
        deleteLabel: vi.fn(),
    },
}))

vi.mock('../api', () => apiMock)

const labels = [
    {id: 'label-1', name: 'Bug', colour: 'red' as const},
    {id: 'label-2', name: 'Chore', colour: 'grey' as const},
]

beforeEach(() => {
    vi.clearAllMocks()
    apiMock.fetchLabels.mockResolvedValue(labels)
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('initial load', () => {
    it('does not fetch without a board', () => {
        renderHook(() => useLabels(null))
        expect(apiMock.fetchLabels).not.toHaveBeenCalled()
    })

    it('loads the labels of the board it is given', async () => {
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))
        expect(apiMock.fetchLabels).toHaveBeenCalledWith('board-1')
    })

    it('reports a failed load without throwing', async () => {
        apiMock.fetchLabels.mockRejectedValue(new Error('network down'))
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.error).toBe('Could not load the labels.'))
        expect(result.current.labels).toEqual([])
    })
})

describe('addLabel', () => {
    it('keeps the list in name order rather than appending', async () => {
        apiMock.createLabel.mockResolvedValue({id: 'label-3', name: 'Blocked', colour: 'amber'})
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.addLabel('Blocked', 'amber')
        })

        expect(result.current.labels.map((label) => label.name)).toEqual([
            'Blocked',
            'Bug',
            'Chore',
        ])
    })

    it('does nothing without a board', async () => {
        const {result} = renderHook(() => useLabels(null))

        await act(async () => {
            await result.current.addLabel('Blocked', 'amber')
        })

        expect(apiMock.createLabel).not.toHaveBeenCalled()
    })

    it('surfaces a rejected create', async () => {
        apiMock.createLabel.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.addLabel('Blocked', 'amber')
        })

        expect(result.current.error).toBe('Could not create the label.')
    })
})

describe('editLabel', () => {
    it('renames in place and re-sorts', async () => {
        apiMock.updateLabel.mockResolvedValue(undefined)
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.editLabel('label-1', 'Zebra', 'blue')
        })

        expect(result.current.labels.map((label) => label.name)).toEqual(['Chore', 'Zebra'])
        expect(result.current.labels[1].colour).toBe('blue')
    })

    it('surfaces a rejected rename', async () => {
        apiMock.updateLabel.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.editLabel('label-1', 'Zebra', 'blue')
        })

        expect(result.current.error).toBe('Could not save the label.')
    })
})

describe('removeLabel', () => {
    it('drops the label from the list', async () => {
        apiMock.deleteLabel.mockResolvedValue(undefined)
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.removeLabel('label-1')
        })

        expect(result.current.labels.map((label) => label.id)).toEqual(['label-2'])
    })

    it('surfaces a rejected delete', async () => {
        apiMock.deleteLabel.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.removeLabel('label-1')
        })

        expect(result.current.error).toBe('Could not delete the label.')
    })
})

describe('error handling', () => {
    it('clears the error once something succeeds', async () => {
        apiMock.deleteLabel.mockRejectedValueOnce(new Error('refused'))
        apiMock.deleteLabel.mockResolvedValue(undefined)
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.removeLabel('label-1')
        })
        expect(result.current.error).toBeTruthy()

        await act(async () => {
            await result.current.removeLabel('label-2')
        })
        expect(result.current.error).toBeNull()
    })

    it('can be dismissed', async () => {
        apiMock.deleteLabel.mockRejectedValue(new Error('refused'))
        const {result} = renderHook(() => useLabels('board-1'))
        await waitFor(() => expect(result.current.labels).toEqual(labels))

        await act(async () => {
            await result.current.removeLabel('label-1')
        })

        act(() => result.current.dismissError())
        expect(result.current.error).toBeNull()
    })

    // Labels belong to a board, so with none selected there is nothing to show
    // even if a previous board left some in state.
    it('reports no labels without a board', () => {
        const {result} = renderHook(() => useLabels(null))
        expect(result.current.labels).toEqual([])
    })
})
