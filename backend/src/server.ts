import 'dotenv/config'
import {createServer} from 'http'
import {Server} from 'socket.io'
import app, {FRONTEND_URL} from './app'
import {initSocket} from './socket'
import {userIdFromToken} from './token'

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
    process.exit(1)
}

// Deliberately not PORT: one `npm run dev` starts both apps, so a generic
// PORT in the environment would be picked up by the frontend dev server too.
const PORT = Number(process.env.BACKEND_PORT) || 3000

// Localhost by default: listen() without a host binds every interface, which
// hands the API to anything else on the same network. A host that needs to
// reach it from outside the machine sets BACKEND_HOST to 0.0.0.0.
const HOST = process.env.BACKEND_HOST || '127.0.0.1'

const httpServer = createServer(app)

const io = new Server(httpServer, {cors: {origin: FRONTEND_URL}})

initSocket(io)

io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
        return next(new Error('No token provided'))
    }

    const userId = userIdFromToken(token)
    if (!userId) {
        return next(new Error('Invalid token'))
    }

    socket.data.userId = userId
    next()
})

io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(userId)

    socket.on('disconnect', () => {
    })
})

httpServer.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`)
})
