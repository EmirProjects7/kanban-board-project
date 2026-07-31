import { Router } from 'express'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.delete('/:cardId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const cardId = req.params.cardId as string

    const card = await prisma.card.findFirst({
        where: { id: cardId, column: { userId: userId } },
    })
    if (!card) {
        return res.status(403).json({ error: 'Not allowed' })
    }

    await prisma.card.delete({ where: { id: cardId } })
    res.status(204).end()
})

router.put('/:cardId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const cardId = req.params.cardId as string
    const { title } = req.body

    const card = await prisma.card.findFirst({
        where: { id: cardId, column: { userId: userId } },
    })
    if (!card) {
        return res.status(403).json({ error: 'Not allowed' })
    }

    const updatedCard = await prisma.card.update({
        where: { id: cardId },
        data: { title: title },
    })
    res.status(200).json(updatedCard)
})

export default router