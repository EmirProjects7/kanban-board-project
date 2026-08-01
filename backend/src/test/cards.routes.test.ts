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
        cardMock.findFirst.mockResolvedValue({id: 'card-1'})
        cardMock.delete.mockResolvedValue({id: 'card-1'})

        const res = await request(app).delete('/api/cards/card-1').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(cardMock.delete).toHaveBeenCalledWith({where: {id: 'card-1'}})
    })

    it('scopes the ownership lookup to the requesting user', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1'})
        cardMock.delete.mockResolvedValue({id: 'card-1'})

        await request(app).delete('/api/cards/card-1').set('Authorization', auth)

        expect(cardMock.findFirst).toHaveBeenCalledWith({
            where: {id: 'card-1', column: {userId: 'user-1'}},
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
        cardMock.findFirst.mockResolvedValue({id: 'card-1'})
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
