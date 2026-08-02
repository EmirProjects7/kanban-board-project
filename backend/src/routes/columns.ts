import {Router} from 'express'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {columnOwnedBy} from '../queries'
import {titleSchema} from '../validation'

const router = Router()

// Listing, creating and reordering columns live under their board, since a
// column has no meaning without one. What is left here acts on a single
// column, reached by its own id.

router.post('/:columnId/cards', authenticate, async (req, res) => {
    const userId = req.userId
    const columnId = req.params.columnId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const column = await prisma.column.findFirst(columnOwnedBy(columnId, userId))
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const count = await prisma.card.count({where: {columnId: columnId}})
    const newCard = await prisma.card.create({
        data: {title: parsed.data.title, columnId: columnId, order: count},
    })
    res.status(201).json(newCard)
    await emitBoard(userId, column.boardId)
})

router.put('/:columnId', authenticate, async (req, res) => {
    const userId = req.userId
    const columnId = req.params.columnId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const column = await prisma.column.findFirst(columnOwnedBy(columnId, userId))
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updatedColumn = await prisma.column.update({
        where: {id: columnId},
        data: {title: parsed.data.title},
    })
    res.status(200).json(updatedColumn)
    await emitBoard(userId, column.boardId)
})

router.delete('/:columnId', authenticate, async (req, res) => {
    const userId = req.userId
    const columnId = req.params.columnId as string

    const column = await prisma.column.findFirst(columnOwnedBy(columnId, userId))
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    await prisma.column.delete({where: {id: columnId}})
    res.status(204).end()
    await emitBoard(userId, column.boardId)
})

export default router
