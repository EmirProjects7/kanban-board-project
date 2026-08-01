import {Router} from 'express'
import {z} from 'zod'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {io} from '../socket'

const router = Router()

const titleSchema = z.object({
    title: z.string().trim().min(1).max(255),
})

async function emitBoard(userId: string) {
    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: {orderBy: {order: 'asc'}}},
    })
    io.to(userId).emit('board:updated', columns)
}

router.delete('/:cardId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string

    const card = await prisma.card.findFirst({
        where: {id: cardId, column: {userId: userId}},
    })
    if (!card) {
        return res.status(403).json({error: 'Not allowed'})
    }

    await prisma.card.delete({where: {id: cardId}})
    res.status(204).end()
    await emitBoard(userId)
})

router.put('/:cardId', authenticate, async (req, res) => {
    const userId = req.userId
    const cardId = req.params.cardId as string

    const parsed = titleSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid title'})
    }

    const card = await prisma.card.findFirst({
        where: {id: cardId, column: {userId: userId}},
    })
    if (!card) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updatedCard = await prisma.card.update({
        where: {id: cardId},
        data: {title: parsed.data.title},
    })
    res.status(200).json(updatedCard)
    await emitBoard(userId)
})

export default router