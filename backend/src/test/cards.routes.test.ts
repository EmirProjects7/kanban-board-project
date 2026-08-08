import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import cardsRouter from '../routes/cards'

const {cardMock, emitBoardMock} = vi.hoisted(() => ({
    cardMock: {
        findFirst: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
    },
    emitBoardMock: vi.fn(),
}))

// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

vi.mock('../prisma', () => ({prisma: {card: cardMock}}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/cards', cardsRouter)

const token = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)
const auth = `Bearer ${token}`

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
})

describe('DELETE /api/cards/:cardId', () => {
    it('requires authentication', async () => {
        const res = await request(app).delete('/api/cards/card-1')
        expect(res.status).toBe(401)
    })

    it('deletes a card the user owns', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        cardMock.delete.mockResolvedValue({id: 'card-1'})

        const res = await request(app).delete('/api/cards/card-1').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(cardMock.delete).toHaveBeenCalledWith({where: {id: 'card-1'}})
    })

    it('reaches the card through its column board, not a column owner', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        cardMock.delete.mockResolvedValue({id: 'card-1'})

        await request(app).delete('/api/cards/card-1').set('Authorization', auth)

        expect(cardMock.findFirst).toHaveBeenCalledWith({
            where: {id: 'card-1', column: {board: {userId: 'user-1'}}},
            include: {column: {select: {boardId: true}}},
        })
    })

    it('refuses to delete a card the user does not own', async () => {
        cardMock.findFirst.mockResolvedValue(null)

        const res = await request(app).delete('/api/cards/other-card').set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(cardMock.delete).not.toHaveBeenCalled()
    })
})

describe('PUT /api/cards/:cardId', () => {
    it('requires authentication', async () => {
        const res = await request(app).put('/api/cards/card-1').send({title: 'New'})
        expect(res.status).toBe(401)
    })

    it('renames a card the user owns', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        cardMock.update.mockResolvedValue({id: 'card-1', title: 'Renamed'})

        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(res.status).toBe(200)
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {title: 'Renamed'},
        })
    })

    it('rejects an empty title', async () => {
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: '   '})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('refuses to rename a card the user does not own', async () => {
        cardMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .put('/api/cards/other-card')
            .set('Authorization', auth)
            .send({title: 'Hijacked'})

        expect(res.status).toBe(403)
        expect(cardMock.update).not.toHaveBeenCalled()
    })
})

describe('card descriptions', () => {
    function reachable() {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        cardMock.update.mockResolvedValue({id: 'card-1'})
    }

    it('saves a description on its own', async () => {
        reachable()

        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({description: 'Ring the supplier first'})

        expect(res.status).toBe(200)
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {description: 'Ring the supplier first'},
        })
    })

    it('leaves the title alone when only the description is sent', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({description: 'Notes'})

        expect(cardMock.update).toHaveBeenCalledWith(
            expect.objectContaining({data: {description: 'Notes'}})
        )
    })

    it('leaves the description alone when only the title is sent', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(cardMock.update).toHaveBeenCalledWith(
            expect.objectContaining({data: {title: 'Renamed'}})
        )
    })

    it('writes both when both are sent', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: 'Renamed', description: 'Notes'})

        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {title: 'Renamed', description: 'Notes'},
        })
    })

    it('clears the description when it is emptied', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({description: '   '})

        // Stored as null so "no description" has a single representation.
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {description: null},
        })
    })

    it('rejects a request that changes nothing', async () => {
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('rejects a description longer than the limit', async () => {
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({description: 'a'.repeat(2001)})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('refuses a card the user cannot reach', async () => {
        cardMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .put('/api/cards/other-card')
            .set('Authorization', auth)
            .send({description: 'Sneaky'})

        expect(res.status).toBe(403)
        expect(cardMock.update).not.toHaveBeenCalled()
    })
})

describe('due dates', () => {
    function reachable() {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        cardMock.update.mockResolvedValue({id: 'card-1'})
    }

    it('stores the day the user picked, at UTC midnight', async () => {
        reachable()

        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({dueDate: '2026-08-05'})

        expect(res.status).toBe(200)
        // Parsing the bare string would read it in the server's timezone and
        // could land on the 4th.
        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {dueDate: new Date('2026-08-05T00:00:00Z')},
        })
    })

    it('clears the date when null is sent', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({dueDate: null})

        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {dueDate: null},
        })
    })

    it('leaves the date alone when only the title is sent', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: 'Renamed'})

        expect(cardMock.update).toHaveBeenCalledWith(
            expect.objectContaining({data: {title: 'Renamed'}})
        )
    })

    it('writes a title and a date together', async () => {
        reachable()

        await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({title: 'Renamed', dueDate: '2026-12-31'})

        expect(cardMock.update).toHaveBeenCalledWith({
            where: {id: 'card-1'},
            data: {title: 'Renamed', dueDate: new Date('2026-12-31T00:00:00Z')},
        })
    })

    it('rejects a date that is not YYYY-MM-DD', async () => {
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({dueDate: '05/08/2026'})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('rejects a day that does not exist', async () => {
        // Date.parse would roll this forward to March rather than refuse it.
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({dueDate: '2026-02-31'})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('rejects a timestamp where a day was expected', async () => {
        const res = await request(app)
            .put('/api/cards/card-1')
            .set('Authorization', auth)
            .send({dueDate: '2026-08-05T13:45:00Z'})

        expect(res.status).toBe(400)
        expect(cardMock.update).not.toHaveBeenCalled()
    })

    it('refuses a card the user cannot reach', async () => {
        cardMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .put('/api/cards/other-card')
            .set('Authorization', auth)
            .send({dueDate: '2026-08-05'})

        expect(res.status).toBe(403)
        expect(cardMock.update).not.toHaveBeenCalled()
    })
})
