import {Router} from 'express'
import {z} from 'zod'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {boardOwnedBy, boardsOfUser, columnsOfBoard} from '../queries'
import {titleSchema} from '../validation'

const router = Router()

const reorderSchema = z.array(
    z.object({
        id: z.string(),
        cards: z.array(z.object({id: z.string()})),
    })
)

router.get('/', authenticate, async (req, res) => {
    const boards = await prisma.board.findMany(boardsOfUser(req.userId))
    res.json(boards)
})

router.post('/', authenticate, async (req, res) => {
    const userId = req.userId

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const count = await prisma.board.count({where: {userId: userId}})
    const board = await prisma.board.create({
        data: {title: parsed.data.title, userId: userId, order: count},
    })
    res.status(201).json(board)
})

router.put('/:boardId', authenticate, async (req, res) => {
    const userId = req.userId
    const boardId = req.params.boardId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    if (!(await prisma.board.findFirst(boardOwnedBy(boardId, userId)))) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updated = await prisma.board.update({
        where: {id: boardId},
        data: {title: parsed.data.title},
    })
    res.status(200).json(updated)
})

router.delete('/:boardId', authenticate, async (req, res) => {
    const userId = req.userId
    const boardId = req.params.boardId as string

    if (!(await prisma.board.findFirst(boardOwnedBy(boardId, userId)))) {
        return res.status(403).json({error: 'Not allowed'})
    }

    // A user with no boards has nowhere to put anything, so the last one stays.
    const count = await prisma.board.count({where: {userId: userId}})
    if (count <= 1) {
        return res.status(409).json({error: 'Your last board cannot be deleted'})
    }

    await prisma.board.delete({where: {id: boardId}})
    res.status(204).end()
})

router.get('/:boardId/columns', authenticate, async (req, res) => {
    const userId = req.userId
    const boardId = req.params.boardId as string

    if (!(await prisma.board.findFirst(boardOwnedBy(boardId, userId)))) {
        return res.status(403).json({error: 'Not allowed'})
    }

    res.json(await prisma.column.findMany(columnsOfBoard(boardId)))
})

router.post('/:boardId/columns', authenticate, async (req, res) => {
    const userId = req.userId
    const boardId = req.params.boardId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    if (!(await prisma.board.findFirst(boardOwnedBy(boardId, userId)))) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const count = await prisma.column.count({where: {boardId: boardId}})
    const newColumn = await prisma.column.create({
        data: {title: parsed.data.title, boardId: boardId, order: count},
        include: {cards: {orderBy: {order: 'asc'}}},
    })
    res.status(201).json(newColumn)
    await emitBoard(userId, boardId)
})

router.put('/:boardId/columns', authenticate, async (req, res) => {
    const userId = req.userId
    const boardId = req.params.boardId as string

    const parsed = reorderSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid board payload'})
    }
    const updatedColumns = parsed.data

    if (!(await prisma.board.findFirst(boardOwnedBy(boardId, userId)))) {
        return res.status(403).json({error: 'Not allowed'})
    }

    // Everything in the payload has to belong to this board, columns and the
    // individual cards alike. Checking only the board would let someone drop
    // another board's card id into the request and have it moved here.
    const [boardColumns, boardCards] = await Promise.all([
        prisma.column.findMany({where: {boardId: boardId}, select: {id: true}}),
        prisma.card.findMany({where: {column: {boardId: boardId}}, select: {id: true}}),
    ])
    const columnIds = new Set(boardColumns.map((column) => column.id))
    const cardIds = new Set(boardCards.map((card) => card.id))

    for (const column of updatedColumns) {
        if (!columnIds.has(column.id)) {
            return res.status(403).json({error: 'Not allowed'})
        }
        for (const card of column.cards) {
            if (!cardIds.has(card.id)) {
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

    res.status(200).json(await prisma.column.findMany(columnsOfBoard(boardId)))
    await emitBoard(userId, boardId)
})

export default router
