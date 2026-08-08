import {describe, it, expect, vi, beforeEach} from 'vitest'
import {readFileSync, readdirSync} from 'fs'
import {join} from 'path'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import boardsRouter from '../routes/boards'
import columnsRouter from '../routes/columns'

const {boardMock, columnMock, cardMock, transactionMock, emitBoardMock} = vi.hoisted(() => ({
    boardMock: {findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn()},
    columnMock: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    cardMock: {findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn()},
    transactionMock: vi.fn(),
    emitBoardMock: vi.fn(),
}))

// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

vi.mock('../prisma', () => ({
    prisma: {board: boardMock, column: columnMock, card: cardMock, $transaction: transactionMock},
}))
vi.mock('../board', () => ({emitBoard: emitBoardMock}))

const app = express()
app.use(express.json())
app.use('/api/boards', boardsRouter)
app.use('/api/columns', columnsRouter)

const auth = `Bearer ${jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)}`

const SQL_INJECTION = "Robert'); DROP TABLE cards; --"
const XSS_PAYLOAD = '<img src=x onerror="alert(1)">'

beforeEach(() => {
    vi.clearAllMocks()
    emitBoardMock.mockResolvedValue(undefined)
    columnMock.count.mockResolvedValue(0)
    boardMock.count.mockResolvedValue(2)
    boardMock.findFirst.mockResolvedValue({id: 'board-1', userId: 'user-1'})
    columnMock.findMany.mockResolvedValue([])
    cardMock.findMany.mockResolvedValue([])
})

describe('SQL injection', () => {
    it('passes a SQL payload to Prisma as a value, never as query text', async () => {
        columnMock.create.mockResolvedValue({id: 'col-1', title: SQL_INJECTION, cards: []})

        const res = await request(app)
            .post('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send({title: SQL_INJECTION})

        expect(res.status).toBe(201)
        // Prisma parameterizes queries, so the payload must arrive as a plain
        // data value rather than being interpolated into SQL.
        expect(columnMock.create).toHaveBeenCalledWith({
            data: {title: SQL_INJECTION, boardId: 'board-1', order: 0},
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
        columnMock.findFirst.mockResolvedValue({id: 'col-1', boardId: 'board-1'})
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
            .get('/api/boards')
            .set('Authorization', `Bearer ${forged}`)

        expect(res.status).toBe(401)
        expect(boardMock.findMany).not.toHaveBeenCalled()
    })

    it('rejects an unsigned "alg: none" token', async () => {
        const header = Buffer.from(JSON.stringify({alg: 'none', typ: 'JWT'})).toString('base64url')
        const payload = Buffer.from(JSON.stringify({userId: 'victim'})).toString('base64url')

        const res = await request(app)
            .get('/api/boards')
            .set('Authorization', `Bearer ${header}.${payload}.`)

        expect(res.status).toBe(401)
        expect(boardMock.findMany).not.toHaveBeenCalled()
    })

    it('rejects an expired token', async () => {
        const expired = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!, {expiresIn: '-1s'})

        const res = await request(app)
            .get('/api/boards')
            .set('Authorization', `Bearer ${expired}`)

        expect(res.status).toBe(401)
        expect(boardMock.findMany).not.toHaveBeenCalled()
    })
})

describe('cross-user access (IDOR)', () => {
    it('reads are always scoped to the token user, never to a client-supplied id', async () => {
        boardMock.findMany.mockResolvedValue([])

        await request(app).get('/api/boards').set('Authorization', auth)

        expect(boardMock.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: {userId: 'user-1'}})
        )
    })

    it('a forged userId in the request body cannot override the token user', async () => {
        boardMock.create.mockResolvedValue({id: 'board-9', title: 'Todo'})

        await request(app)
            .post('/api/boards')
            .set('Authorization', auth)
            .send({title: 'Todo', userId: 'victim'})

        expect(boardMock.create).toHaveBeenCalledWith({
            data: {title: 'Todo', userId: 'user-1', order: 2},
        })
    })

    it('a column cannot be moved onto a board the user does not own', async () => {
        boardMock.findFirst.mockResolvedValue(null)

        const res = await request(app)
            .post('/api/boards/someone-elses-board/columns')
            .set('Authorization', auth)
            .send({title: 'Todo'})

        expect(res.status).toBe(403)
        expect(columnMock.create).not.toHaveBeenCalled()
    })

    it('a card id from another board cannot be dragged into this one', async () => {
        columnMock.findMany.mockResolvedValue([{id: 'col-1'}])
        cardMock.findMany.mockResolvedValue([{id: 'card-1'}])

        const res = await request(app)
            .put('/api/boards/board-1/columns')
            .set('Authorization', auth)
            .send([{id: 'col-1', cards: [{id: 'card-from-another-board'}]}])

        expect(res.status).toBe(403)
        expect(transactionMock).not.toHaveBeenCalled()
    })
})
