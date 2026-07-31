import 'dotenv/config'
import express from 'express'
import type {Request, Response, NextFunction} from 'express'
import cors from 'cors'
import {PrismaClient} from './generated/prisma/client'
import {PrismaPg} from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})

function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({error: 'No token provided'})
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        ;(req as any).userId = decoded.userId
        next()
    } catch (error) {
        return res.status(401).json({error: 'Invalid token'})
    }
}

const app = express()
app.use(cors({origin: 'http://localhost:5173'}))
app.use(express.json())
const PORT = 3000

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

app.post('/api/auth/register', async (req, res) => {
    const {email, password} = req.body
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const user = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
            },
        })
        res.status(201).json({id: user.id, email: user.email})
    } catch (error) {
        res.status(400).json({error: 'Email already in use'})
    }
})

app.post('/api/auth/login', async (req, res) => {
    const {email, password} = req.body
    const user = await prisma.user.findUnique({
        where: {email: email},
    })

    if (!user) {
        return res.status(401).json({error: 'Invalid credentials'})
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
        return res.status(401).json({error: 'Invalid credentials'})
    }

    const token = jwt.sign(
        {userId: user.id},
        process.env.JWT_SECRET!,
        {expiresIn: '7d'}
    )

    res.json({token: token, user: {id: user.id, email: user.email}})
})

app.get('/api/columns', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: true}
    })
    res.json(columns)
})

app.post('/api/columns/:columnId/cards', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columnId = req.params.columnId as string
    const {title} = req.body

    const column = await prisma.column.findFirst({
        where: {id: userId, userId: userId},
    })
    if (!column) {
        return res.status(401).json({error: 'Not allowed!'})
    }
    const newCard = await prisma.card.create({
        data: {
            title: title,
            columnId: columnId,
        }
    })
    res.status(201).json(newCard)
})

app.post('/api/columns', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const {title} = req.body
    const newColumn = await prisma.column.create({
        data: {title: title, userId: userId},
        include: {cards: true}
    })
    res.status(201).json(newColumn)
})

app.delete('/api/cards/:cardId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const cardId = req.params.cardId as string

    const card = await prisma.card.findFirst({
        where: {id: cardId, column: {userId: userId}},
    })

    if (!card) {
        return res.status(401).json({error: 'Not allowed!'})
    }

    await prisma.card.delete({
        where: {id: cardId as string},
    })
    res.status(204).end()
})

app.delete('/api/columns/:columnId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const columnId = req.params.columnId as string

    const column = await prisma.column.findFirst({
        
        where: {id: columnId, userId: userId},
    })

    if (!column) {
        return res.status(401).json({error: 'Not allowed!'})
    }

    await prisma.column.delete({
        where: {id: columnId as string},
    })
    res.status(204).end()
})

app.put('/api/cards/:cardId', authenticate, async (req, res) => {
    const userId = (req as any).userId
    const cardId = req.params.cardId as string
    const {title} = req.body

    const card = await prisma.card.findFirst({
        where: {id: cardId, column: {userId: userId}}
    })

    if (!card) {
        return res.status(401).json({error: 'Not allowed!'})
    }

    const updatedCard = await prisma.card.update({
        where: {id: cardId as string},
        data: {title: title}
    })
    res.status(200).json({updatedCard})
})

app.put('/api/columns', authenticate, async (req, res) => {
    const updatedColumns = req.body

    for (const column of updatedColumns) {
        for (const card of column.cards) {
            await prisma.card.update({
                where: {id: card.id},
                data: {columnId: column.id}
            })
        }
    }

    const columns = await prisma.column.findMany({
        include: {cards: true}
    })
    res.status(200).json(columns)
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})