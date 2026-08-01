import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import * as api from '../api'

function mockFetch(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
        ...response,
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('token storage', () => {
    it('returns null when no token is stored', () => {
        expect(api.getToken()).toBeNull()
    })

    it('round-trips a stored token', () => {
        api.setToken('abc123')
        expect(api.getToken()).toBe('abc123')
    })

    it('clears a stored token', () => {
        api.setToken('abc123')
        api.clearToken()
        expect(api.getToken()).toBeNull()
    })
})

describe('auth headers', () => {
    it('sends the bearer token when one is stored', async () => {
        api.setToken('abc123')
        const fetchMock = mockFetch({json: async () => []})

        await api.fetchColumns()

        const headers = fetchMock.mock.calls[0][1].headers
        expect(headers.Authorization).toBe('Bearer abc123')
    })

    it('omits the Authorization header when no token is stored', async () => {
        const fetchMock = mockFetch({json: async () => []})

        await api.fetchColumns()

        const headers = fetchMock.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })
})

describe('response status handling', () => {
    it('throws when a read request fails', async () => {
        mockFetch({ok: false, status: 401})
        await expect(api.fetchColumns()).rejects.toThrow()
    })

    it('throws when creating a card fails', async () => {
        mockFetch({ok: false, status: 403})
        await expect(api.createCard('col-1', 'Task')).rejects.toThrow()
    })

    it('throws when deleting a card fails', async () => {
        mockFetch({ok: false, status: 403})
        await expect(api.deleteCard('card-1')).rejects.toThrow()
    })

    it('throws when updating a card fails', async () => {
        mockFetch({ok: false, status: 500})
        await expect(api.updateCard('card-1', 'New')).rejects.toThrow()
    })

    it('throws when creating a column fails', async () => {
        mockFetch({ok: false, status: 400})
        await expect(api.createColumn('Todo')).rejects.toThrow()
    })

    it('throws when deleting a column fails', async () => {
        mockFetch({ok: false, status: 403})
        await expect(api.deleteColumn('col-1')).rejects.toThrow()
    })

    it('throws when saving the board fails', async () => {
        mockFetch({ok: false, status: 403})
        await expect(api.saveBoard([])).rejects.toThrow()
    })

    it('resolves when the request succeeds', async () => {
        mockFetch({json: async () => [{id: 'col-1', title: 'Todo', cards: []}]})
        await expect(api.fetchColumns()).resolves.toHaveLength(1)
    })
})

describe('login and register', () => {
    it('throws on failed login', async () => {
        mockFetch({ok: false, status: 401})
        await expect(api.login('a@b.com', 'wrong')).rejects.toThrow('Login failed')
    })

    it('throws on failed registration', async () => {
        mockFetch({ok: false, status: 409})
        await expect(api.register('a@b.com', 'secret123')).rejects.toThrow('Registration failed')
    })

    it('does not attach a stale token to the login request', async () => {
        api.setToken('stale-token')
        const fetchMock = mockFetch({json: async () => ({token: 'new-token'})})

        await api.login('a@b.com', 'secret123')

        const headers = fetchMock.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })
})
