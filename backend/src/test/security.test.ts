import {describe, it, expect, vi, beforeEach} from 'vitest'
import {readFileSync, readdirSync} from 'fs'
import {join} from 'path'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import columnsRouter from '../routes/columns'

const {columnMock, cardMock, transactionMock, emitBoardMock} = vi.hoisted(() => ({
    columnMock: {findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn()},
    cardMock: {findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn()},
    transactionMock: vi.fn(),
    emitBoardMock: vi.fn(),
}))

vi.mock('../prisma', () => ({
    prisma: {column: columnMock, card: cardMock, $transaction: transactionMock},
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/columns', columnsRouter)

const auth = `Bearer ${jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)}`

const SQL_INJECTION = "Robert'); DROP TABLE cards; --"
const XSS_PAYLOAD = '<img src=x onerror="alert(1)">'

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
})

describe('SQL injection', () => {
    it('passes a SQL payload to Prisma as a value, never as query text', async () => {
        columnMock.create.mockResolvedValue({id: 'col-1', title: SQL_INJECTION, cards: []})

        const res = await request(app)
            .post('/api/columns')
            .set('Authorization', auth)
            .send({title: SQL_INJECTION})

        expect(res.status).toBe(201)
        // Prisma parameterizes queries, so the payload must arrive as a plain
        // data value rather than being interpolated into SQL.
        expect(columnMock.create).toHaveBeenCalledWith({
            data: {title: SQL_INJECTION, userId: 'user-1'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })

    function collectOffenders(isOffending: (contents: string) => boolean) {
        const offenders: string[] = []

        function walk(dir: string) {
            for (const entry of readdirSync(dir, {withFileTypes: true})) {
                const full = join(dir, entry.name)
                if (entry.isDirectory()) {
                    if (entry.name === 'generated' || entry.name === 'test') continue
                    walk(full)
                    continue
                }
                if (!entry.name.endsWith('.ts')) continue
                if (isOffending(readFileSync(full, 'utf8'))) {
                    offenders.push(full)
                }
            }
        }
        walk(join(__dirname, '..'))

        return offenders
    }

    it('never uses the unsafe Prisma raw query APIs anywhere in src', () => {
        const unsafeApis = ['$queryRawUnsafe', '$executeRawUnsafe']

        const offenders = collectOffenders((contents) =>
            unsafeApis.some((api) => contents.includes(api))
        )

        expect(offenders).toEqual([])
    })

    it('only ever uses $queryRaw/$executeRaw in their tagged template form', () => {
        // Prisma parameterises the tagged form, so `$queryRaw`SELECT 1`` is safe.
        // The call form `$queryRaw(someString)` takes a prebuilt string and is not.
        const callForm = /\$(?:queryRaw|executeRaw)\s*\(/

        const offenders = collectOffenders((contents) => callForm.test(contents))

        expect(offenders).toEqual([])
    })
})

describe('stored XSS payloads', () => {
    it('stores a script payload verbatim without server-side interpretation', async () => {
        columnMock.findFirst.mockResolvedValue({id: 'col-1'})
        cardMock.count.mockResolvedValue(0)
        cardMock.create.mockResolvedValue({id: 'card-1', title: XSS_PAYLOAD, order: 0})

        const res = await request(app)
            .post('/api/columns/col-1/cards')
            .set('Authorization', auth)
            .send({title: XSS_PAYLOAD})

        expect(res.status).toBe(201)
        expect(cardMock.create).toHaveBeenCalledWith({
            data: {title: XSS_PAYLOAD, columnId: 'col-1', order: 0},
        })
    })
})

describe('JWT tampering', () => {
    it('rejects a token whose payload was swapped to another user id', async () => {
        const valid = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)
        const [header, , signature] = valid.split('.')
        const forgedPayload = Buffer.from(JSON.stringify({userId: 'victim'}))
            .toString('base64url')
        const forged = `${header}.${forgedPayload}.${signature}`

        const res = await request(app)
            .get('/api/columns')
            .set('Authorization', `Bearer ${forged}`)

        expect(res.status).toBe(401)
        expect(columnMock.findMany).not.toHaveBeenCalled()
    })

    it('rejects an unsigned "alg: none" token', async () => {
        const header = Buffer.from(JSON.stringify({alg: 'none', typ: 'JWT'})).toString('base64url')
        const payload = Buffer.from(JSON.stringify({userId: 'victim'})).toString('base64url')

        const res = await request(app)
            .get('/api/columns')
            .set('Authorization', `Bearer ${header}.${payload}.`)

        expect(res.status).toBe(401)
        expect(columnMock.findMany).not.toHaveBeenCalled()
    })

    it('rejects an expired token', async () => {
        const expired = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!, {expiresIn: '-1s'})

        const res = await request(app)
            .get('/api/columns')
            .set('Authorization', `Bearer ${expired}`)

        expect(res.status).toBe(401)
        expect(columnMock.findMany).not.toHaveBeenCalled()
    })
})

describe('cross-user access (IDOR)', () => {
    it('reads are always scoped to the token user, never to a client-supplied id', async () => {
        columnMock.findMany.mockResolvedValue([])

        await request(app).get('/api/columns').set('Authorization', auth)

        expect(columnMock.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: {userId: 'user-1'}})
        )
    })

    it('a forged userId in the request body cannot override the token user', async () => {
        columnMock.create.mockResolvedValue({id: 'col-1', title: 'Todo', cards: []})

        await request(app)
            .post('/api/columns')
            .set('Authorization', auth)
            .send({title: 'Todo', userId: 'victim'})

        expect(columnMock.create).toHaveBeenCalledWith({
            data: {title: 'Todo', userId: 'user-1'},
            include: {cards: {orderBy: {order: 'asc'}}},
        })
    })
})
