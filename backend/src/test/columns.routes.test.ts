import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import columnsRouter from '../routes/columns'

const {columnMock, cardMock, emitBoardMock} = vi.hoisted(() => ({
    columnMock: {findFirst: vi.fn(), update: vi.fn(), delete: vi.fn()},
    cardMock: {count: vi.fn(), create: vi.fn()},
    emitBoardMock: vi.fn(),
}))

// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

vi.mock('../prisma', () => ({
    prisma: {column: columnMock, card: cardMock},
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/columns', columnsRouter)

const auth = `Bearer ${jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)}`

// Reachable means the column exists on a board belonging to the caller.
function reachable() {
    columnMock.findFirst.mockResolvedValue({id: 'col-1', boardId: 'board-1'})
}

function unreachable() {
    columnMock.findFirst.mockResolvedValue(null)
}

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
    cardMock.count.mockResolvedValue(0)
})

describe('ownership runs through the board', () => {
    it('looks the column up by its board owner, not by a column owner', async () => {
        reachable()
        columnMock.update.mockResolvedValue({id: 'col-1', title: 'Renamed'})

        await request(app)
            .put('/api/columns/col-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(columnMock.findFirst).toHaveBeenCalledWith({
            where: {id: 'col-1', board: {userId: 'user-1'}},
        })
    })
})

describe('POST /api/columns/:columnId/cards', () => {
    it('requires authentication', async () => {
        const res = await request(app).post('/api/columns/col-1/cards').send({title: 'Task'})
        expect(res.status).toBe(401)
    })

    it('appends the card at the end of the column', async () => {
        reachable()
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

    it('refuses a column the user cannot reach', async () => {
        unreachable()

        const res = await request(app)
            .post('/api/columns/someone-elses/cards')
            .set('Authorization', auth)
            .send({title: 'Task'})

        expect(res.status).toBe(403)
        expect(cardMock.create).not.toHaveBeenCalled()
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .post('/api/columns/col-1/cards')
            .set('Authorization', auth)
            .send({title: '   '})

        expect(res.status).toBe(400)
        expect(cardMock.create).not.toHaveBeenCalled()
    })

    it('broadcasts the board the column sits on', async () => {
        reachable()
        cardMock.create.mockResolvedValue({id: 'card-1', title: 'Task', order: 0})

        await request(app)
            .post('/api/columns/col-1/cards')
            .set('Authorization', auth)
            .send({title: 'Task'})

        expect(emitBoardMock).toHaveBeenCalledWith('user-1', 'board-1')
    })
})

describe('PUT /api/columns/:columnId (rename)', () => {
    it('renames a column the user can reach', async () => {
        reachable()
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

    it('refuses a column the user cannot reach', async () => {
        unreachable()

        const res = await request(app)
            .put('/api/columns/someone-elses')
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
})

describe('DELETE /api/columns/:columnId', () => {
    it('deletes a column the user can reach', async () => {
        reachable()
        columnMock.delete.mockResolvedValue({id: 'col-1'})

        const res = await request(app).delete('/api/columns/col-1').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(columnMock.delete).toHaveBeenCalledWith({where: {id: 'col-1'}})
    })

    it('refuses a column the user cannot reach', async () => {
        unreachable()

        const res = await request(app)
            .delete('/api/columns/someone-elses')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(columnMock.delete).not.toHaveBeenCalled()
    })
})
