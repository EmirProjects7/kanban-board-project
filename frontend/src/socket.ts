import { io, Socket } from 'socket.io-client'
import { BASE_URL, getToken } from './api'

let socket: Socket | null = null

export function connectSocket(): Socket {
    if (socket) return socket
    socket = io(BASE_URL, {
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