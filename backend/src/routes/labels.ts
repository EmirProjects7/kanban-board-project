import {Router} from 'express'
import {prisma} from '../prisma'
import {authenticate} from '../middleware/authenticate'
import {emitBoard} from '../board'
import {labelOwnedBy} from '../queries'
import {labelSchema} from '../validation'

const router = Router()

// Creating and listing labels happens under their board, since a label has no
// meaning without one. What is left here acts on a single label.

router.put('/:labelId', authenticate, async (req, res) => {
    const userId = req.userId
    const labelId = req.params.labelId as string

    const parsed = labelSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid label'})
    }

    const label = await prisma.label.findFirst(labelOwnedBy(labelId, userId))
    if (!label) {
        return res.status(403).json({error: 'Not allowed'})
    }

    const updated = await prisma.label.update({
        where: {id: labelId},
        data: {name: parsed.data.name, colour: parsed.data.colour},
    })
    res.status(200).json(updated)
    // Renaming or recolouring changes how every card carrying it looks.
    await emitBoard(userId, label.boardId)
})

router.delete('/:labelId', authenticate, async (req, res) => {
    const userId = req.userId
    const labelId = req.params.labelId as string

    const label = await prisma.label.findFirst(labelOwnedBy(labelId, userId))
    if (!label) {
        return res.status(403).json({error: 'Not allowed'})
    }

    // The join rows go with it through the cascade, so cards simply stop
    // carrying the label.
    await prisma.label.delete({where: {id: labelId}})
    res.status(204).end()
    await emitBoard(userId, label.boardId)
})

export default router
