import { io, Socket } from 'socket.io-client'
import { getToken } from './api'

let socket: Socket | null = null

export function connectSocket(): Socket {
    if (socket) return socket
    socket = io('http://localhost:3000', {
        auth: { token: getToken() },
    })
    return socket
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}