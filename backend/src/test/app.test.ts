import {describe, it, expect, vi, beforeEach} from 'vitest'
import {testClient} from './client'
import app from '../app'

const {queryRawMock} = vi.hoisted(() => ({queryRawMock: vi.fn()}))

vi.mock('../prisma', () => ({
    prisma: {$queryRaw: queryRawMock},
}))

const client = testClient(app)

beforeEach(() => {
    vi.clearAllMocks()
})

describe('GET /', () => {
    it('reports ok and a connected database when the query succeeds', async () => {
        queryRawMock.mockResolvedValue([{'?column?': 1}])

        const res = await client().get('/')

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('ok')
        expect(res.body.database).toBe('connected')
    })

    it('reports degraded and an unreachable database when the query throws', async () => {
        queryRawMock.mockRejectedValue(new Error('connection refused'))

        const res = await client().get('/')

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('degraded')
        expect(res.body.database).toBe('unreachable')
    })

    it('lists the endpoints the api serves', async () => {
        queryRawMock.mockResolvedValue([{'?column?': 1}])

        const res = await client().get('/')

        expect(res.body.endpoints.health).toBe('/health')
        expect(res.body.endpoints.auth).toContain('POST /api/auth/login')
        expect(res.body.endpoints.boards).toContain('GET /api/boards')
        expect(res.body.endpoints.columns).toContain('PUT /api/columns/:columnId')
    })

    it('says that board endpoints need a bearer token', async () => {
        queryRawMock.mockResolvedValue([{'?column?': 1}])

        const res = await client().get('/')

        expect(res.body.note).toMatch(/Bearer/)
    })
})

describe('GET /health', () => {
    it('answers ok without touching the database', async () => {
        const res = await client().get('/health')

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('ok')
        expect(queryRawMock).not.toHaveBeenCalled()
    })
})

describe('unknown routes', () => {
    it('still 404s instead of pretending to succeed', async () => {
        const res = await client().get('/definitely-not-a-route')

        expect(res.status).toBe(404)
    })
})
