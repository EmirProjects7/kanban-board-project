import { io, Socket } from 'socket.io-client'
import { BASE_URL, getToken, handleUnauthorized } from './api'

let socket: Socket | null = null

export function connectSocket(): Socket {
    if (socket) return socket
    socket = io(BASE_URL, {
        auth: { token: getToken() },
    })

    // socket.io retries a transport failure on its own and leaves `active`
    // true. False means the server refused the handshake and no retry is
    // coming, which for this server only happens when the token is rejected.
    // Without this the connection dies silently and the board simply stops
    // receiving updates.
    socket.on('connect_error', () => {
        if (socket && !socket.active) {
            handleUnauthorized()
        }
    })

    return socket
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}
