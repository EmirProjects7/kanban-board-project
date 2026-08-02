import {Router} from 'express'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {cardOwnedBy} from '../queries'
import {titleSchema} from '../validation'

const router = Router()

// The board a card sits on is needed to broadcast the change, so it is
// fetched alongside the ownership check rather than in a second query.
const withBoardId = {include: {column: {select: {boardId: true}}}}

router.delete('/:cardId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string

    const card = await prisma.card.findFirst({
        ...cardOwnedBy(cardId, userId),
        ...withBoardId,
    })
    if (!card) {
        return res.status(403).json({error: 'Not allowed'})
    }

    await prisma.card.delete({where: {id: cardId}})
    res.status(204).end()
    await emitBoard(userId, card.column.boardId)
})

router.put('/:cardId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const card = await prisma.card.findFirst({
        ...cardOwnedBy(cardId, userId),
        ...withBoardId,
    })
    if (!card) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updatedCard = await prisma.card.update({
        where: {id: cardId},
        data: {title: parsed.data.title},
    })
    res.status(200).json(updatedCard)
    await emitBoard(userId, card.column.boardId)
})

export default router
