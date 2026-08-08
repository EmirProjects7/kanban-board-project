import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import boardsRouter from '../routes/boards'

const {boardMock, columnMock, cardMock, transactionMock, emitBoardMock} = vi.hoisted(() => ({
    boardMock: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    columnMock: {findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn()},
    cardMock: {findMany: vi.fn(), update: vi.fn()},
    transactionMock: vi.fn(),
    emitBoardMock: vi.fn(),
}))

// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

vi.mock('../prisma', () => ({
    prisma: {
        board: boardMock,
        column: columnMock,
        card: cardMock,
        $transaction: transactionMock,
    },
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/boards', boardsRouter)

const auth = `Bearer ${jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)}`

// The board exists and belongs to user-1 unless a test says otherwise.
function ownsBoard() {
    boardMock.findFirst.mockResolvedValue({id: 'board-1', userId: 'user-1'})
}

function refusesBoard() {
    boardMock.findFirst.mockResolvedValue(null)
}

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
    transactionMock.mockResolvedValue([])
    boardMock.count.mockResolvedValue(2)
    columnMock.count.mockResolvedValue(0)
    columnMock.findMany.mockResolvedValue([])
    cardMock.findMany.mockResolvedValue([])
})

describe('GET /api/boards', () => {
    it('requires authentication', async () => {
        expect((await request(app).get('/api/boards')).status).toBe(401)
    })

    it('returns only the requesting user boards, in order', async () => {
        boardMock.findMany.mockResolvedValue([{id: 'board-1', title: 'My Board'}])

        const res = await request(app).get('/api/boards').set('Authorization', auth)

        expect(res.status).toBe(200)
        expect(boardMock.findMany).toHaveBeenCalledWith({
            where: {userId: 'user-1'},
            orderBy: {order: 'asc'},
        })
    })
})

describe('POST /api/boards', () => {
    it('creates a board owned by the requesting user', async () => {
        boardMock.count.mockResolvedValue(1)
        boardMock.create.mockResolvedValue({id: 'board-2', title: 'Work'})

        const res = await request(app)
            .post('/api/boards')
            .set('Authorization', auth)
            .send({title: 'Work'})

        expect(res.status).toBe(201)
        expect(boardMock.create).toHaveBeenCalledWith({
            data: {title: 'Work', userId: 'user-1', order: 1},
        })
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .post('/api/boards')
            .set('Authorization', auth)
            .send({title: '  '})

        expect(res.status).toBe(400)
        expect(boardMock.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/boards/:boardId', () => {
    it('renames a board the user owns', async () => {
        ownsBoard()
        boardMock.update.mockResolvedValue({id: 'board-1', title: 'Renamed'})

        const res = await request(app)
            .put('/api/boards/board-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(res.status).toBe(200)
        expect(boardMock.update).toHaveBeenCalledWith({
            where: {id: 'board-1'},
            data: {title: 'Renamed'},
        })
    })

    it('refuses a board belonging to someone else', async () => {
        refusesBoard()

        const res = await request(app)
            .put('/api/boards/someone-elses')
            .set('Authorization', auth)
            .send({title: 'Hijacked'})

        expect(res.status).toBe(403)
        expect(boardMock.update).not.toHaveBeenCalled()
    })
})

describe('DELETE /api/boards/:boardId', () => {
    it('deletes a board the user owns', async () => {
        ownsBoard()
        boardMock.count.mockResolvedValue(3)

        const res = await request(app)
            .delete('/api/boards/board-1')
            .set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(boardMock.delete).toHaveBeenCalledWith({where: {id: 'board-1'}})
    })

    it('refuses a board belonging to someone else', async () => {
        refusesBoard()

        const res = await request(app)
            .delete('/api/boards/someone-elses')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(boardMock.delete).not.toHaveBeenCalled()
    })

    it('keeps the last board, so the user is never left with nowhere to work', async () => {
        ownsBoard()
        boardMock.count.mockResolvedValue(1)

        const res = await request(app)
            .delete('/api/boards/board-1')
            .set('Authorization', auth)

        expect(res.status).toBe(409)
        expect(boardMock.delete).not.toHaveBeenCalled()
    })
})

describe('GET /api/boards/:boardId/columns', () => {
    it('returns the columns of that board', async () => {
        ownsBoard()
        columnMock.findMany.mockResolvedValue([{id: 'col-1', title: 'Todo', cards: []}])

        const res = await request(app)
            .get('/api/boards/board-1/columns')
            .set('Authorization', auth)

        expect(res.status).toBe(200)
        expect(columnMock.findMany).toHaveBeenCalledWith({
            where: {boardId: 'board-1'},
            orderBy: {order: 'asc'},
            include: {
                cards: {
                    orderBy: {order: 'asc'},
                    include: {labels: {include: {label: true}}},
                },
            },
        })
    })

    it('refuses to read a board belonging to someone else', async () => {
        refusesBoard()

        const res = await request(app)
            .get('/api/boards/someone-elses/columns')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(columnMock.findMany).not.toHaveBeenCalled()
    })
})

describe('POST /api/boards/:boardId/columns', () => {
    it('appends the column to that board', async () => {
        ownsBoard()
        columnMock.count.mockResolvedValue(2)
        columnMock.create.mockResolvedValue({id: 'col-3', title: 'Done', cards: []})

        const res = await request(app)
            .post('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send({title: 'Done'})

        expect(res.status).toBe(201)
        expect(columnMock.create).toHaveBeenCalledWith({
            data: {title: 'Done', boardId: 'board-1', order: 2},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })

    it('refuses to add a column to a board belonging to someone else', async () => {
        refusesBoard()

        const res = await request(app)
            .post('/api/boards/someone-elses/columns')
            .set('Authorization', auth)
            .send({title: 'Done'})

        expect(res.status).toBe(403)
        expect(columnMock.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/boards/:boardId/columns (reorder)', () => {
    function boardContains(columnIds: string[], cardIds: string[]) {
        ownsBoard()
        columnMock.findMany.mockResolvedValue(columnIds.map((id) => ({id})))
        cardMock.findMany.mockResolvedValue(cardIds.map((id) => ({id})))
    }

    it('writes the payload order onto the columns', async () => {
        boardContains(['col-1', 'col-2'], [])

        const res = await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send([
                {id: 'col-2', cards: []},
                {id: 'col-1', cards: []},
            ])

        expect(res.status).toBe(200)
        expect(columnMock.update).toHaveBeenCalledWith({
            where: {id: 'col-2'},
            data: {order: 0},
        })
        expect(columnMock.update).toHaveBeenCalledWith({
            where: {id: 'col-1'},
            data: {order: 1},
        })
    })

    it('writes the card positions in the same transaction', async () => {
        boardContains(['col-1'], ['card-1', 'card-2'])

        await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'card-2'}, {id: 'card-1'}]}])

        expect(transactionMock).toHaveBeenCalledOnce()
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-2'},
            data: {columnId: 'col-1', order: 0},
        })
    })

    it('refuses a column that belongs to another board', async () => {
        boardContains(['col-1'], [])

        const res = await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send([{id: 'column-from-another-board', cards: []}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('refuses a card from another board, even inside a column of this one', async () => {
        boardContains(['col-1'], ['card-1'])

        const res = await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'card-from-another-board'}]}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('refuses to reorder a board belonging to someone else', async () => {
        refusesBoard()

        const res = await request(app)
            .put('/api/boards/someone-elses/columns')
            .set('Authorization', auth)
            .send([])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('rejects a payload that is not an array of columns', async () => {
        ownsBoard()

        const res = await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send({nonsense: true})

        expect(res.status).toBe(400)
        expect(transactionMock).not.toHaveBeenCalled()
    })
})

describe('PUT /api/boards/order', () => {
    it('requires authentication', async () => {
        const res = await request(app).put('/api/boards/order').send([])
        expect(res.status).toBe(401)
    })

    it('writes the payload order onto the boards', async () => {
        boardMock.findMany.mockResolvedValue([{id: 'board-1'}, {id: 'board-2'}])

        const res = await request(app)
            .put('/api/boards/order')
            .set('Authorization', auth)
            .send([{id: 'board-2'}, {id: 'board-1'}])

        expect(res.status).toBe(200)
        expect(boardMock.update).toHaveBeenCalledWith({
            where: {id: 'board-2'},
            data: {order: 0},
        })
        expect(boardMock.update).toHaveBeenCalledWith({
            where: {id: 'board-1'},
            data: {order: 1},
        })
    })

    it('applies the whole order in one transaction', async () => {
        boardMock.findMany.mockResolvedValue([{id: 'board-1'}, {id: 'board-2'}])

        await request(app)
            .put('/api/boards/order')
            .set('Authorization', auth)
            .send([{id: 'board-2'}, {id: 'board-1'}])

        expect(transactionMock).toHaveBeenCalledOnce()
    })

    it('refuses a board belonging to someone else', async () => {
        boardMock.findMany.mockResolvedValue([{id: 'board-1'}])

        const res = await request(app)
            .put('/api/boards/order')
            .set('Authorization', auth)
            .send([{id: 'board-1'}, {id: 'someone-elses'}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('rejects a payload that is not a list of boards', async () => {
        const res = await request(app)
            .put('/api/boards/order')
            .set('Authorization', auth)
            .send({nonsense: true})

        expect(res.status).toBe(400)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('is not mistaken for a board called "order"', async () => {
        // /order is declared first, so it must not fall through to the rename
        // route and try to rename a board with that id.
        boardMock.findMany.mockResolvedValue([])

        await request(app).put('/api/boards/order').set('Authorization', auth).send([])

        expect(boardMock.update).not.toHaveBeenCalled()
    })
})
