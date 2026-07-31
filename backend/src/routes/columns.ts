import {Router} from 'express'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {io} from '../socket'

const router = Router()


async function emitBoard(userId: string) {
    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: true},
    })
    io.to(userId).emit('board:updated', columns)
}

router.get('/', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: true},
    })
    res.json(columns)
})

router.post('/', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const {title} = req.body
    const newColumn = await prisma.column.create({
        data: {title: title, userId: userId},
        include: {cards: true},
    })
    res.status(201).json(newColumn)
    await emitBoard(userId)
})

router.post('/:columnId/cards', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columnId = req.params.columnId as string
    const {title} = req.body

    const column = await prisma.column.findFirst({
        where: {id: columnId, userId: userId},
    })
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const newCard = await prisma.card.create({
        data: {title: title, columnId: columnId},
    })
    res.status(201).json(newCard)
    await emitBoard(userId)
})

router.delete('/:columnId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columnId = req.params.columnId as string

    const column = await prisma.column.findFirst({
        where: {id: columnId, userId: userId},
    })
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    await prisma.column.delete({where: {id: columnId}})
    res.status(204).end()
    await emitBoard(userId)
})

router.put('/', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const updatedColumns = req.body

    const userColumns = await prisma.column.findMany({
        where: {userId: userId},
        select: {id: true}
    })

    const ownedIds = new Set(userColumns.map(column => column.id))

    for (const column of updatedColumns) {
        if (!ownedIds.has(column.id)) {
            return res.status(403).json({error: 'Not allowed'})
        }
        for (const card of column.cards) {
            await prisma.card.update({
                where: {id: card.id},
                data: {columnId: column.id},
            })
        }
    }

    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: true},
    })
    res.status(200).json(columns)
    await emitBoard(userId)
})

export default router