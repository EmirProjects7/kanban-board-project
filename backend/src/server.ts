import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import {createServer} from 'http'
import {Server} from 'socket.io'
import jwt from 'jsonwebtoken'
import authRouter from './routes/auth'
import columnsRouter from './routes/columns'
import cardsRouter from './routes/cards'
import { initSocket } from './socket'

const app = express()
app.use(cors({origin: 'http://localhost:5173'}))
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/columns', columnsRouter)
app.use('/api/cards', cardsRouter)
const PORT = 3000

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

const httpServer = createServer(app)

const io = new Server(httpServer, {cors: {origin: 'http://localhost:5173'}})

initSocket(io)

io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
        return next(new Error('No token provided'))
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        socket.data.userId = decoded.userId
        next()
    } catch {
        next(new Error('Invalid token'))
    }
})

io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(userId)

    socket.on('disconnect', () => {
    })
})

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})