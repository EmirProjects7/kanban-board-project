import 'dotenv/config'
import express from 'express'
import type {ErrorRequestHandler} from 'express'
import cors from 'cors'
import {createServer} from 'http'
import {Server} from 'socket.io'
import jwt from 'jsonwebtoken'
import authRouter from './routes/auth'
import columnsRouter from './routes/columns'
import cardsRouter from './routes/cards'
import { initSocket } from './socket'
import { authLimiter, apiLimiter } from './middleware/rateLimit'

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
    process.exit(1)
}

const PORT = Number(process.env.PORT) || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const app = express()
app.use(cors({origin: FRONTEND_URL}))
app.use(express.json())
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/columns', apiLimiter, columnsRouter)
app.use('/api/cards', apiLimiter, cardsRouter)

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }
    console.error(err)
    res.status(500).json({error: 'Internal server error'})
}
app.use(jsonErrorHandler)

const httpServer = createServer(app)

const io = new Server(httpServer, {cors: {origin: FRONTEND_URL}})

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