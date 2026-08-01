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

    it('fetches the user columns, ordered cards, and broadcasts to that user only', async () => {
        const columns = [{id: 'col-1', title: 'Todo', cards: []}]
        findManyMock.mockResolvedValue(columns)

        await emitBoard('user-1')

        expect(findManyMock).toHaveBeenCalledWith({
            where: {userId: 'user-1'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
        expect(toMock).toHaveBeenCalledWith('user-1')
        expect(emitMock).toHaveBeenCalledWith('board:updated', columns)
    })
})
