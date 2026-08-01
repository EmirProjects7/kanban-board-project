import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import request from 'supertest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authRouter from '../routes/auth'
import {Prisma} from '../generated/prisma/client'

const {userMock} = vi.hoisted(() => ({
    userMock: {
        create: vi.fn(),
        findUnique: vi.fn(),
    },
}))

vi.mock('../prisma', () => ({prisma: {user: userMock}}))

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

beforeEach(() => {
    vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
    it('creates a user and never returns the password', async () => {
        userMock.create.mockResolvedValue({id: 'user-1', email: 'a@b.com'})

        const res = await request(app)
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.status).toBe(201)
        expect(res.body).toEqual({id: 'user-1', email: 'a@b.com'})
        expect(res.body.password).toBeUndefined()
    })

    it('stores the password hashed, not in plaintext', async () => {
        userMock.create.mockResolvedValue({id: 'user-1', email: 'a@b.com'})

        await request(app)
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: 'secret123'})

        const stored = userMock.create.mock.calls[0][0].data.password
        expect(stored).not.toBe('secret123')
        expect(await bcrypt.compare('secret123', stored)).toBe(true)
    })

    it('rejects an invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({email: 'not-an-email', password: 'secret123'})

        expect(res.status).toBe(400)
        expect(userMock.create).not.toHaveBeenCalled()
    })

    it('rejects a password shorter than 5 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: '123'})

        expect(res.status).toBe(400)
        expect(userMock.create).not.toHaveBeenCalled()
    })

    it('returns 409 when the email is already taken', async () => {
        userMock.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: 'test',
            })
        )

        const res = await request(app)
            .post('/api/auth/register')
            .send({email: 'taken@b.com', password: 'secret123'})

        expect(res.status).toBe(409)
    })

    it('returns 500 rather than a misleading conflict for unexpected database errors', async () => {
        userMock.create.mockRejectedValue(new Error('connection lost'))

        const res = await request(app)
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.status).toBe(500)
    })
})

describe('POST /api/auth/login', () => {
    async function existingUser(password: string) {
        return {
            id: 'user-1',
            email: 'a@b.com',
            password: await bcrypt.hash(password, 10),
        }
    }

    it('returns a token signed with the user id', async () => {
        userMock.findUnique.mockResolvedValue(await existingUser('secret123'))

        const res = await request(app)
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.status).toBe(200)
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as {userId: string}
        expect(decoded.userId).toBe('user-1')
    })

    it('never returns the password hash', async () => {
        userMock.findUnique.mockResolvedValue(await existingUser('secret123'))

        const res = await request(app)
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.body.user.password).toBeUndefined()
    })

    it('rejects a wrong password', async () => {
        userMock.findUnique.mockResolvedValue(await existingUser('secret123'))

        const res = await request(app)
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'wrong-password'})

        expect(res.status).toBe(401)
    })

    it('returns the same error for an unknown email as for a wrong password', async () => {
        userMock.findUnique.mockResolvedValue(null)

        const res = await request(app)
            .post('/api/auth/login')
            .send({email: 'nobody@b.com', password: 'secret123'})

        expect(res.status).toBe(401)
        expect(res.body.error).toBe('Invalid credentials')
    })
})
