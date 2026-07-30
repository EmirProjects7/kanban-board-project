import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import {PrismaClient} from './generated/prisma/client'
import {PrismaPg} from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})


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

app.get('/api/columns', async (req, res) => {
    const columns = await prisma.column.findMany({
        include: {cards: true}
    })
    res.json(columns)
})

app.post('/api/columns/:columnId/cards', async (req, res) => {
    const {columnId} = req.params
    const {title} = req.body
    const newCard = await prisma.card.create({
        data: {
            title: title,
            columnId: columnId
        }
    })
    res.status(201).json(newCard)
})

app.post('/api/columns', async (req, res) => {
    const {title} = req.body
    const newColumn = await prisma.column.create({
        data: {title: title},
        include: {cards: true}
    })
    res.status(201).json(newColumn)
})

app.delete('/api/cards/:cardId', async (req, res) => {
    const {cardId} = req.params
    await prisma.card.delete({
        where: {id: cardId}
    })
    res.status(204).end()
})

app.delete('/api/columns/:columnId', async (req, res) => {
    const {columnId} = req.params
    await prisma.column.delete({
        where: {id: columnId}
    })
    res.status(204).end()
})

app.put('/api/cards/:cardId', async (req, res) => {
    const {cardId} = req.params
    const {title} = req.body
    const updatedCard = await prisma.card.update({
        where: {id: cardId},
        data: {title: title}
    })
    res.status(200).json({updatedCard})
})

app.put('/api/columns', async (req, res) => {
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