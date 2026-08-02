import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {connectSocket, disconnectSocket} from '../socket'
import * as api from '../api'

const {ioMock, madeSockets} = vi.hoisted(() => {
    const madeSockets: Array<{
        active: boolean
        connected: boolean
        handlers: Record<string, () => void>
        on: (event: string, handler: () => void) => void
        disconnect: () => void
    }> = []

    const ioMock = vi.fn(() => {
        const socket = {
            active: true,
            connected: false,
            handlers: {} as Record<string, () => void>,
            on(event: string, handler: () => void) {
                this.handlers[event] = handler
            },
            disconnect: vi.fn(),
        }
        madeSockets.push(socket)
        return socket
    })

    return {ioMock, madeSockets}
})

vi.mock('socket.io-client', () => ({io: ioMock}))

function latestSocket() {
    return madeSockets[madeSockets.length - 1]
}

function failHandshake({retrying}: {retrying: boolean}) {
    const socket = latestSocket()
    socket.active = retrying
    socket.handlers['connect_error']()
}

beforeEach(() => {
    vi.clearAllMocks()
    madeSockets.length = 0
    localStorage.clear()
    disconnectSocket()
})

afterEach(() => {
    disconnectSocket()
    api.setUnauthorizedHandler(null)
})

describe('connecting', () => {
    it('sends the stored token with the handshake', () => {
        api.setToken('a-token')

        connectSocket()

        expect(ioMock).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({auth: {token: 'a-token'}})
        )
    })

    it('reuses the existing connection', () => {
        const first = connectSocket()
        const second = connectSocket()

        expect(first).toBe(second)
        expect(ioMock).toHaveBeenCalledOnce()
    })

    it('opens a fresh connection after disconnecting', () => {
        connectSocket()
        disconnectSocket()
        connectSocket()

        expect(ioMock).toHaveBeenCalledTimes(2)
    })

    it('closes the underlying socket on disconnect', () => {
        connectSocket()
        const socket = latestSocket()

        disconnectSocket()

        expect(socket.disconnect).toHaveBeenCalledOnce()
    })
})

describe('a handshake the server refuses', () => {
    it('ends the session instead of failing silently', () => {
        api.setToken('expired-token')
        const onUnauthorized = vi.fn()
        api.setUnauthorizedHandler(onUnauthorized)
        connectSocket()

        failHandshake({retrying: false})

        expect(api.getToken()).toBeNull()
        expect(onUnauthorized).toHaveBeenCalledOnce()
    })
})

describe('a connection the client will retry', () => {
    it('keeps the session while socket.io reconnects', () => {
        api.setToken('good-token')
        const onUnauthorized = vi.fn()
        api.setUnauthorizedHandler(onUnauthorized)
        connectSocket()

        // The server being down must not look like a rejected token.
        failHandshake({retrying: true})

        expect(api.getToken()).toBe('good-token')
        expect(onUnauthorized).not.toHaveBeenCalled()
    })
})
