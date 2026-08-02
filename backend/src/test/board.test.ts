import {describe, it, expect, vi, beforeEach} from 'vitest'
import {emitBoard} from '../board'

const {findManyMock, emitMock, toMock} = vi.hoisted(() => {
    const emitMock = vi.fn()
    return {
        findManyMock: vi.fn(),
        emitMock,
        toMock: vi.fn().mockReturnValue({emit: emitMock}),
    }
})

vi.mock('../prisma', () => ({
    prisma: {
        column: {findMany: findManyMock},
    },
}))

vi.mock('../socket', () => ({
    io: {to: toMock},
}))

describe('emitBoard', () => {
    beforeEach(() => {
        findManyMock.mockReset()
        emitMock.mockReset()
        toMock.mockClear()
    })

    it('reads the columns of the given board, cards in order', async () => {
        findManyMock.mockResolvedValue([])

        await emitBoard('user-1', 'board-1')

        expect(findManyMock).toHaveBeenCalledWith({
            where: {boardId: 'board-1'},
            orderBy: {order: 'asc'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })

    it('broadcasts to that user only', async () => {
        findManyMock.mockResolvedValue([])

        await emitBoard('user-1', 'board-1')

        expect(toMock).toHaveBeenCalledWith('user-1')
    })

    it('names the board in the payload so other boards can ignore it', async () => {
        const columns = [{id: 'col-1', title: 'Todo', cards: []}]
        findManyMock.mockResolvedValue(columns)

        await emitBoard('user-1', 'board-1')

        expect(emitMock).toHaveBeenCalledWith('board:updated', {
            boardId: 'board-1',
            columns,
        })
    })
})
