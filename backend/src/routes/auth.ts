import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma'

const router = Router()

router.post('/register', async (req, res) => {
    const { email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const user = await prisma.user.create({
            data: { email: email, password: hashedPassword },
        })
        res.status(201).json({ id: user.id, email: user.email })
    } catch (error) {
        res.status(400).json({ error: 'Email already in use' })
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email: email } })

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    )

    res.json({ token: token, user: { id: user.id, email: user.email } })
})

export default router