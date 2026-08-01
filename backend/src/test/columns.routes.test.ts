import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import columnsRouter from '../routes/columns'

const {columnMock, cardMock, transactionMock, emitBoardMock} = vi.hoisted(() => ({
    columnMock: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    cardMock: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    transactionMock: vi.fn(),
    emitBoardMock: vi.fn(),
}))

vi.mock('../prisma', () => ({
    prisma: {column: columnMock, card: cardMock, $transaction: transactionMock},
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/columns', columnsRouter)

const token = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)
const auth = `Bearer ${token}`

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
    transactionMock.mockResolvedValue([])
})

describe('GET /api/columns', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/columns')
        expect(res.status).toBe(401)
    })

    it('returns only the requesting user columns with cards in order', async () => {
        const columns = [{id: 'col-1', title: 'Todo', cards: []}]
        columnMock.findMany.mockResolvedValue(columns)

        const res = await request(app).get('/api/columns').set('Authorization', auth)

        expect(res.status).toBe(200)
        expect(res.body).toEqual(columns)
        expect(columnMock.findMany).toHaveBeenCalledWith({
            where: {userId: 'user-1'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })
})

describe('POST /api/columns', () => {
    it('creates a column owned by the requesting user', async () => {
        columnMock.create.mockResolvedValue({id: 'col-1', title: 'Todo', cards: []})

        const res = await request(app)
            .post('/api/columns')
            .set('Authorization', auth)
            .send({title: 'Todo'})

        expect(res.status).toBe(201)
        expect(columnMock.create).toHaveBeenCalledWith({
            data: {title: 'Todo', userId: 'user-1'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .post('/api/columns')
            .set('Authorization', auth)
            .send({title: ''})

        expect(res.status).toBe(400)
        expect(columnMock.create).not.toHaveBeenCalled()
    })
})

describe('POST /api/columns/:columnId/cards', () => {
    it('appends the new card at the end of the column', async () => {
        columnMock.findFirst.mockResolvedValue({id: 'col-1'})
        cardMock.count.mockResolvedValue(3)
        cardMock.create.mockResolvedValue({id: 'card-1', title: 'Task', order: 3})

        const res = await request(app)
            .post('/api/columns/col-1/cards')
            .set('Authorization', auth)
            .send({title: 'Task'})

        expect(res.status).toBe(201)
        expect(cardMock.create).toHaveBeenCalledWith({
            data: {title: 'Task', columnId: 'col-1', order: 3},
        })
    })

    it('refuses to add a card to a column the user does not own', async () => {
        columnMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .post('/api/columns/other-col/cards')
            .set('Authorization', auth)
            .send({title: 'Task'})

        expect(res.status).toBe(403)
        expect(cardMock.create).not.toHaveBeenCalled()
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .post('/api/columns/col-1/cards')
            .set('Authorization', auth)
            .send({title: '  '})

        expect(res.status).toBe(400)
        expect(cardMock.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/columns/:columnId (rename)', () => {
    it('requires authentication', async () => {
        const res = await request(app).put('/api/columns/col-1').send({title: 'Renamed'})
        expect(res.status).toBe(401)
    })

    it('renames a column the user owns', async () => {
        columnMock.findFirst.mockResolvedValue({id: 'col-1'})
        columnMock.update.mockResolvedValue({id: 'col-1', title: 'Renamed'})

        const res = await request(app)
            .put('/api/columns/col-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(res.status).toBe(200)
        expect(columnMock.update).toHaveBeenCalledWith({
            where: {id: 'col-1'},
            data: {title: 'Renamed'},
        })
    })

    it('refuses to rename a column the user does not own', async () => {
        columnMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .put('/api/columns/other-col')
            .set('Authorization', auth)
            .send({title: 'Hijacked'})

        expect(res.status).toBe(403)
        expect(columnMock.update).not.toHaveBeenCalled()
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .put('/api/columns/col-1')
            .set('Authorization', auth)
            .send({title: '   '})

        expect(res.status).toBe(400)
        expect(columnMock.update).not.toHaveBeenCalled()
    })

    it('broadcasts the change to the user', async () => {
        columnMock.findFirst.mockResolvedValue({id: 'col-1'})
        columnMock.update.mockResolvedValue({id: 'col-1', title: 'Renamed'})

        await request(app)
            .put('/api/columns/col-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(emitBoardMock).toHaveBeenCalledWith('user-1')
    })
})

describe('DELETE /api/columns/:columnId', () => {
    it('deletes a column the user owns', async () => {
        columnMock.findFirst.mockResolvedValue({id: 'col-1'})
        columnMock.delete.mockResolvedValue({id: 'col-1'})

        const res = await request(app).delete('/api/columns/col-1').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(columnMock.delete).toHaveBeenCalledWith({where: {id: 'col-1'}})
    })

    it('refuses to delete a column the user does not own', async () => {
        columnMock.findFirst.mockResolvedValue(null)

        const res = await request(app).delete('/api/columns/other-col').set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(columnMock.delete).not.toHaveBeenCalled()
    })
})

describe('PUT /api/columns (board reorder)', () => {
    function ownBoard() {
        columnMock.findMany.mockResolvedValue([{id: 'col-1'}, {id: 'col-2'}])
        cardMock.findMany.mockResolvedValue([{id: 'card-1'}, {id: 'card-2'}])
    }

    it('requires authentication', async () => {
        const res = await request(app).put('/api/columns').send([])
        expect(res.status).toBe(401)
    })

    it('rejects a payload that is not an array of columns', async () => {
        const res = await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send({nonsense: true})

        expect(res.status).toBe(400)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('persists the new card order', async () => {
        ownBoard()
        columnMock.findMany
            .mockResolvedValueOnce([{id: 'col-1'}, {id: 'col-2'}])
            .mockResolvedValueOnce([])

        const res = await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'card-2'}, {id: 'card-1'}]}])

        expect(res.status).toBe(200)
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-2'},
            data: {columnId: 'col-1', order: 0},
        })
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {columnId: 'col-1', order: 1},
        })
    })

    it('applies the updates as a single transaction', async () => {
        ownBoard()
        columnMock.findMany
            .mockResolvedValueOnce([{id: 'col-1'}, {id: 'col-2'}])
            .mockResolvedValueOnce([])

        await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'card-1'}, {id: 'card-2'}]}])

        expect(transactionMock).toHaveBeenCalledOnce()
    })

    it('refuses a column the user does not own', async () => {
        ownBoard()

        const res = await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send([{id: 'someone-elses-column', cards: []}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('refuses a card the user does not own, even inside a column they do own', async () => {
        ownBoard()

        const res = await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'someone-elses-card'}]}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })

    it('writes nothing when any column in the payload fails the ownership check', async () => {
        ownBoard()

        await request(app)
            .put('/api/columns')
            .set('Authorization', auth)
            .send([
                {id: 'col-1', cards: [{id: 'card-1'}]},
                {id: 'someone-elses-column', cards: []},
            ])

        expect(transactionMock).not.toHaveBeenCalled()
        expect(cardMock.update).not.toHaveBeenCalled()
    })
})
