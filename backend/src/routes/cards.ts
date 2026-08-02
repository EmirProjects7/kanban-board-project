import {Router} from 'express'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {cardOwnedBy, labelOwnedBy} from '../queries'
import {cardUpdateSchema} from '../validation'

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

    const parsed = cardUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid card'})
    }

    const card = await prisma.card.findFirst({
        ...cardOwnedBy(cardId, userId),
        ...withBoardId,
    })
    if (!card) {
        return res.status(403).json({error: 'Not allowed'})
    }

    // Only the fields that were sent are written, so renaming a card does not
    // wipe its description and vice versa.
    const updatedCard = await prisma.card.update({
        where: {id: cardId},
        data: {
            ...(parsed.data.title !== undefined ? {title: parsed.data.title} : {}),
            ...(parsed.data.description !== undefined
                ? {description: parsed.data.description}
                : {}),
        },
    })
    res.status(200).json(updatedCard)
    await emitBoard(userId, card.column.boardId)
})

// Attaching is refused unless the label and the card sit on the same board.
// Checking only that both belong to the user would let a label from one of
// their boards be pinned onto a card on another.
async function reachablePair(cardId: string, labelId: string, userId: string) {
    const [card, label] = await Promise.all([
        prisma.card.findFirst({...cardOwnedBy(cardId, userId), ...withBoardId}),
        prisma.label.findFirst(labelOwnedBy(labelId, userId)),
    ])
    if (!card || !label) return null
    if (card.column.boardId !== label.boardId) return null
    return {boardId: label.boardId}
}

router.put('/:cardId/labels/:labelId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string
    const labelId = req.params.labelId as string

    const pair = await reachablePair(cardId, labelId, userId)
    if (!pair) {
        return res.status(403).json({error: 'Not allowed'})
    }

    // Attaching twice is not an error, it just stays attached.
    await prisma.cardLabel.upsert({
        where: {cardId_labelId: {cardId: cardId, labelId: labelId}},
        create: {cardId: cardId, labelId: labelId},
        update: {},
    })
    res.status(204).end()
    await emitBoard(userId, pair.boardId)
})

router.delete('/:cardId/labels/:labelId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string
    const labelId = req.params.labelId as string

    const pair = await reachablePair(cardId, labelId, userId)
    if (!pair) {
        return res.status(403).json({error: 'Not allowed'})
    }

    await prisma.cardLabel.deleteMany({where: {cardId: cardId, labelId: labelId}})
    res.status(204).end()
    await emitBoard(userId, pair.boardId)
})

export default router
