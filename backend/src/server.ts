import 'dotenv/config'
import {createServer} from 'http'
import {Server} from 'socket.io'
import app, {FRONTEND_URL} from './app'
import {initSocket} from './socket'
import {claimsFromToken} from './token'
import {isTokenCurrent} from './session'

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
    process.exit(1)
}

// This signs every session token, so guessing it means minting a token for
// any account. `openssl rand -base64 32` gives 44 characters; 32 leaves room
// for other generators while still refusing anything typed by hand.
const MINIMUM_SECRET_LENGTH = 32
if (process.env.JWT_SECRET!.length < MINIMUM_SECRET_LENGTH) {
    console.error(
        `JWT_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters. ` +
            'Generate one with: openssl rand -base64 32'
    )
    process.exit(1)
}

// Not PORT: two servers run in this repo, and the name should say which one.
// Pairs with BACKEND_HOST and POSTGRES_PORT.
const PORT = Number(process.env.BACKEND_PORT) || 3000

// Localhost by default: listen() without a host binds every interface, which
// hands the API to anything else on the same network. A host that needs to
// reach it from outside the machine sets BACKEND_HOST to 0.0.0.0.
const HOST = process.env.BACKEND_HOST || '127.0.0.1'

const httpServer = createServer(app)

const io = new Server(httpServer, {cors: {origin: FRONTEND_URL}})

initSocket(io)

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
        return next(new Error('No token provided'))
    }

    // Same check the REST middleware makes, so a token retired by logging out
    // cannot keep a socket open and carrying updates.
    const claims = claimsFromToken(token)
    if (!claims || !(await isTokenCurrent(claims))) {
        return next(new Error('Invalid token'))
    }

    socket.data.userId = claims.userId
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
