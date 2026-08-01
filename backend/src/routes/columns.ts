import {Router} from 'express'
import {z} from 'zod'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {boardQuery} from '../queries'
import {titleSchema} from '../validation'

const router = Router()

const reorderSchema = z.array(
    z.object({
        id: z.string(),
        cards: z.array(z.object({id: z.string()})),
    })
)

router.get('/', authenticate, async (req, res) => {
    const userId = req.userId
    const columns = await prisma.column.findMany(boardQuery(userId))
    res.json(columns)
})

router.post('/', authenticate, async (req, res) => {
    const userId = req.userId

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const count = await prisma.column.count({where: {userId: userId}})
    const newColumn = await prisma.column.create({
        data: {title: parsed.data.title, userId: userId, order: count},
        include: {cards: {orderBy: {order: 'asc'}}},
    })
    res.status(201).json(newColumn)
    await emitBoard(userId)
})

router.post('/:columnId/cards', authenticate, async (req, res) => {
    const userId = req.userId
    const columnId = req.params.columnId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const column = await prisma.column.findFirst({
        where: {id: columnId, userId: userId},
    })
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const count = await prisma.card.count({where: {columnId: columnId}})
    const newCard = await prisma.card.create({
        data: {title: parsed.data.title, columnId: columnId, order: count},
    })
    res.status(201).json(newCard)
    await emitBoard(userId)
})

router.put('/:columnId', authenticate, async (req, res) => {
    const userId = req.userId
    const columnId = req.params.columnId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const column = await prisma.column.findFirst({
        where: {id: columnId, userId: userId},
    })
    if (!column) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updatedColumn = await prisma.column.update({
        where: {id: columnId},
        data: {title: parsed.data.title},
    })
    res.status(200).json(updatedColumn)
    await emitBoard(userId)
})

router.delete('/:columnId', authenticate, async (req, res) => {
    const userId = req.userId
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
    const userId = req.userId

    const parsed = reorderSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid board payload'})
    }
    const updatedColumns = parsed.data

    // Ownership must be checked for both columns AND the individual cards being
    // reassigned into them, otherwise a user could move another user's card
    // into their own column by id (IDOR).
    const [userColumns, userCards] = await Promise.all([
        prisma.column.findMany({where: {userId: userId}, select: {id: true}}),
        prisma.card.findMany({where: {column: {userId: userId}}, select: {id: true}}),
    ])
    const ownedColumnIds = new Set(userColumns.map((column) => column.id))
    const ownedCardIds = new Set(userCards.map((card) => card.id))

    for (const column of updatedColumns) {
        if (!ownedColumnIds.has(column.id)) {
            return res.status(403).json({error: 'Not allowed'})
        }
        for (const card of column.cards) {
            if (!ownedCardIds.has(card.id)) {
                return res.status(403).json({error: 'Not allowed'})
            }
        }
    }

    // The position of a column in the payload is its new order, same as the
    // position of a card within a column. Applied as a single transaction so a
    // mid-batch failure can't leave the board partially reordered.
    await prisma.$transaction([
        ...updatedColumns.map((column, index) =>
            prisma.column.update({
                where: {id: column.id},
                data: {order: index},
            })
        ),
        ...updatedColumns.flatMap((column) =>
            column.cards.map((card, index) =>
                prisma.card.update({
                    where: {id: card.id},
                    data: {columnId: column.id, order: index},
                })
            )
        ),
    ])

    const columns = await prisma.column.findMany(boardQuery(userId))
    res.status(200).json(columns)
    await emitBoard(userId)
})

export default router