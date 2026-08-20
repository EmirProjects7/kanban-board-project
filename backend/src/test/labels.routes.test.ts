import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import {testClient} from './client'
import jwt from 'jsonwebtoken'
import labelsRouter from '../routes/labels'
import cardsRouter from '../routes/cards'
import boardsRouter from '../routes/boards'

const {boardMock, labelMock, cardMock, cardLabelMock, columnMock, emitBoardMock} = vi.hoisted(
    () => ({
        boardMock: {findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn()},
        labelMock: {findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn()},
        cardMock: {findFirst: vi.fn()},
        cardLabelMock: {upsert: vi.fn(), deleteMany: vi.fn()},
        columnMock: {findMany: vi.fn(), count: vi.fn()},
        emitBoardMock: vi.fn(),
    })
)

// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

vi.mock('../prisma', () => ({
    prisma: {
        board: boardMock,
        label: labelMock,
        card: cardMock,
        cardLabel: cardLabelMock,
        column: columnMock,
    },
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/boards', boardsRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/labels', labelsRouter)

const client = testClient(app)

const auth = `Bearer ${jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)}`

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
    boardMock.count.mockResolvedValue(2)
    columnMock.count.mockResolvedValue(0)
    columnMock.findMany.mockResolvedValue([])
})

describe('GET /api/boards/:boardId/labels', () => {
    it('requires authentication', async () => {
        expect((await client().get('/api/boards/board-1/labels')).status).toBe(401)
    })

    it('returns the labels of that board', async () => {
        boardMock.findFirst.mockResolvedValue({id: 'board-1'})
        labelMock.findMany.mockResolvedValue([{id: 'label-1', name: 'Bug', colour: 'red'}])

        const res = await client()
            .get('/api/boards/board-1/labels')
            .set('Authorization', auth)

        expect(res.status).toBe(200)
        expect(labelMock.findMany).toHaveBeenCalledWith({
            where: {boardId: 'board-1'},
            orderBy: {name: 'asc'},
        })
    })

    it('refuses a board belonging to someone else', async () => {
        boardMock.findFirst.mockResolvedValue(null)

        const res = await client()
            .get('/api/boards/someone-elses/labels')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(labelMock.findMany).not.toHaveBeenCalled()
    })
})

describe('POST /api/boards/:boardId/labels', () => {
    it('creates a label on that board', async () => {
        boardMock.findFirst.mockResolvedValue({id: 'board-1'})
        labelMock.create.mockResolvedValue({id: 'label-1', name: 'Bug', colour: 'red'})

        const res = await client()
            .post('/api/boards/board-1/labels')
            .set('Authorization', auth)
            .send({name: 'Bug', colour: 'red'})

        expect(res.status).toBe(201)
        expect(labelMock.create).toHaveBeenCalledWith({
            data: {name: 'Bug', colour: 'red', boardId: 'board-1'},
        })
    })

    it('rejects a colour outside the allowed set', async () => {
        boardMock.findFirst.mockResolvedValue({id: 'board-1'})

        const res = await client()
            .post('/api/boards/board-1/labels')
            .set('Authorization', auth)
            .send({name: 'Sneaky', colour: 'url(javascript:alert(1))'})

        expect(res.status).toBe(400)
        expect(labelMock.create).not.toHaveBeenCalled()
    })

    it('rejects an empty name', async () => {
        const res = await client()
            .post('/api/boards/board-1/labels')
            .set('Authorization', auth)
            .send({name: '   ', colour: 'red'})

        expect(res.status).toBe(400)
        expect(labelMock.create).not.toHaveBeenCalled()
    })

    it('refuses to add a label to a board belonging to someone else', async () => {
        boardMock.findFirst.mockResolvedValue(null)

        const res = await client()
            .post('/api/boards/someone-elses/labels')
            .set('Authorization', auth)
            .send({name: 'Bug', colour: 'red'})

        expect(res.status).toBe(403)
        expect(labelMock.create).not.toHaveBeenCalled()
    })
})

describe('PUT /api/labels/:labelId', () => {
    it('renames and recolours a label the user can reach', async () => {
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})
        labelMock.update.mockResolvedValue({id: 'label-1', name: 'Defect', colour: 'amber'})

        const res = await client()
            .put('/api/labels/label-1')
            .set('Authorization', auth)
            .send({name: 'Defect', colour: 'amber'})

        expect(res.status).toBe(200)
        expect(labelMock.update).toHaveBeenCalledWith({
            where: {id: 'label-1'},
            data: {name: 'Defect', colour: 'amber'},
        })
    })

    it('reaches the label through its board owner', async () => {
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})
        labelMock.update.mockResolvedValue({id: 'label-1'})

        await client()
            .put('/api/labels/label-1')
            .set('Authorization', auth)
            .send({name: 'Defect', colour: 'amber'})

        expect(labelMock.findFirst).toHaveBeenCalledWith({
            where: {id: 'label-1', board: {userId: 'user-1'}},
        })
    })

    it('broadcasts, since every card carrying it changes', async () => {
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})
        labelMock.update.mockResolvedValue({id: 'label-1'})

        await client()
            .put('/api/labels/label-1')
            .set('Authorization', auth)
            .send({name: 'Defect', colour: 'amber'})

        expect(emitBoardMock).toHaveBeenCalledWith('user-1', 'board-1')
    })

    it('refuses a label the user cannot reach', async () => {
        labelMock.findFirst.mockResolvedValue(null)

        const res = await client()
            .put('/api/labels/someone-elses')
            .set('Authorization', auth)
            .send({name: 'Hijacked', colour: 'red'})

        expect(res.status).toBe(403)
        expect(labelMock.update).not.toHaveBeenCalled()
    })
})

describe('DELETE /api/labels/:labelId', () => {
    it('deletes a label the user can reach', async () => {
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})
        labelMock.delete.mockResolvedValue({id: 'label-1'})

        const res = await client().delete('/api/labels/label-1').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(labelMock.delete).toHaveBeenCalledWith({where: {id: 'label-1'}})
    })

    it('refuses a label the user cannot reach', async () => {
        labelMock.findFirst.mockResolvedValue(null)

        const res = await client()
            .delete('/api/labels/someone-elses')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(labelMock.delete).not.toHaveBeenCalled()
    })
})

describe('attaching a label to a card', () => {
    function onSameBoard() {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})
    }

    it('attaches when both sit on the same board', async () => {
        onSameBoard()

        const res = await client()
            .put('/api/cards/card-1/labels/label-1')
            .set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(cardLabelMock.upsert).toHaveBeenCalledWith({
            where: {cardId_labelId: {cardId: 'card-1', labelId: 'label-1'}},
            create: {cardId: 'card-1', labelId: 'label-1'},
            update: {},
        })
    })

    it('attaching twice leaves it attached rather than failing', async () => {
        onSameBoard()

        const first = await client()
            .put('/api/cards/card-1/labels/label-1')
            .set('Authorization', auth)
        const second = await client()
            .put('/api/cards/card-1/labels/label-1')
            .set('Authorization', auth)

        expect(first.status).toBe(204)
        expect(second.status).toBe(204)
    })

    it('refuses a label from one of the user other boards', async () => {
        // Both belong to the caller, but they are not on the same board.
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        labelMock.findFirst.mockResolvedValue({id: 'label-9', boardId: 'board-2'})

        const res = await client()
            .put('/api/cards/card-1/labels/label-9')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(cardLabelMock.upsert).not.toHaveBeenCalled()
    })

    it('refuses a card belonging to someone else', async () => {
        cardMock.findFirst.mockResolvedValue(null)
        labelMock.findFirst.mockResolvedValue({id: 'label-1', boardId: 'board-1'})

        const res = await client()
            .put('/api/cards/someone-elses/labels/label-1')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(cardLabelMock.upsert).not.toHaveBeenCalled()
    })

    it('refuses a label belonging to someone else', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        labelMock.findFirst.mockResolvedValue(null)

        const res = await client()
            .put('/api/cards/card-1/labels/someone-elses')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(cardLabelMock.upsert).not.toHaveBeenCalled()
    })

    it('detaches an attached label', async () => {
        onSameBoard()

        const res = await client()
            .delete('/api/cards/card-1/labels/label-1')
            .set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(cardLabelMock.deleteMany).toHaveBeenCalledWith({
            where: {cardId: 'card-1', labelId: 'label-1'},
        })
    })

    it('refuses to detach across boards', async () => {
        cardMock.findFirst.mockResolvedValue({id: 'card-1', column: {boardId: 'board-1'}})
        labelMock.findFirst.mockResolvedValue({id: 'label-9', boardId: 'board-2'})

        const res = await client()
            .delete('/api/cards/card-1/labels/label-9')
            .set('Authorization', auth)

        expect(res.status).toBe(403)
        expect(cardLabelMock.deleteMany).not.toHaveBeenCalled()
    })
})
