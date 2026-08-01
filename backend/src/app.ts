import express from 'express'
import type {ErrorRequestHandler} from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import columnsRouter from './routes/columns'
import cardsRouter from './routes/cards'
import {prisma} from './prisma'
import {authLimiter, apiLimiter} from './middleware/rateLimit'

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const app = express()
app.use(cors({origin: FRONTEND_URL}))
app.use(express.json())
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/columns', apiLimiter, columnsRouter)
app.use('/api/cards', apiLimiter, cardsRouter)

// Opening the API host in a browser used to hit Express's "Cannot GET /".
// This lists what the API serves and whether the database is actually
// reachable, so the page is a real signal rather than a static blurb.
app.get('/', async (req, res) => {
    let database: 'connected' | 'unreachable' = 'connected'
    try {
        await prisma.$queryRaw`SELECT 1`
    } catch (error) {
        console.error(error)
        database = 'unreachable'
    }

    res.json({
        name: 'kanban-board-api',
        status: database === 'connected' ? 'ok' : 'degraded',
        database,
        endpoints: {
            health: '/health',
            auth: ['POST /api/auth/register', 'POST /api/auth/login'],
            columns: [
                'GET /api/columns',
                'POST /api/columns',
                'PUT /api/columns',
                'PUT /api/columns/:columnId',
                'DELETE /api/columns/:columnId',
                'POST /api/columns/:columnId/cards',
            ],
            cards: ['PUT /api/cards/:cardId', 'DELETE /api/cards/:cardId'],
        },
        note: 'Board endpoints require an Authorization: Bearer <token> header.',
    })
})

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

export default app
