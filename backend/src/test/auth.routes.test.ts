import {describe, it, expect, vi, beforeEach} from 'vitest'
import express from 'express'
import {testClient} from './client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authRouter from '../routes/auth'
import {Prisma} from '../generated/prisma/client'

const {userMock} = vi.hoisted(() => ({
    userMock: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
}))

vi.mock('../prisma', () => ({prisma: {user: userMock}}))
// The version check has its own tests; here every signed token is current.
vi.mock('../session', () => ({isTokenCurrent: () => Promise.resolve(true)}))

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

const client = testClient(app)

beforeEach(() => {
    vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
    it('creates a user and never returns the password', async () => {
        userMock.create.mockResolvedValue({id: 'user-1', email: 'a@b.com'})

        const res = await client()
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.status).toBe(201)
        expect(res.body).toEqual({id: 'user-1', email: 'a@b.com'})
        expect(res.body.password).toBeUndefined()
    })

    it('stores the password hashed, not in plaintext', async () => {
        userMock.create.mockResolvedValue({id: 'user-1', email: 'a@b.com'})

        await client()
            .post('/api/auth/register')
            .send({email: 'a@b.com', password: 'secret123'})

        const stored = userMock.create.mock.calls[0][0].data.password
        expect(stored).not.toBe('secret123')
        expect(await bcrypt.compare('secret123', stored)).toBe(true)
    })

    it('rejects an invalid email', async () => {
        const res = await client()
            .post('/api/auth/register')
            .send({email: 'not-an-email', password: 'secret123'})

        expect(res.status).toBe(400)
        expect(userMock.create).not.toHaveBeenCalled()
    })

    it('rejects a password shorter than 5 characters', async () => {
        const res = await client()
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

        const res = await client()
            .post('/api/auth/register')
            .send({email: 'taken@b.com', password: 'secret123'})

        expect(res.status).toBe(409)
    })

    it('returns 500 rather than a misleading conflict for unexpected database errors', async () => {
        userMock.create.mockRejectedValue(new Error('connection lost'))

        const res = await client()
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

        const res = await client()
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.status).toBe(200)
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as {userId: string}
        expect(decoded.userId).toBe('user-1')
    })

    // Without this the token cannot be checked against the account later, and
    // logging out would have nothing to compare.
    it('signs the account version into the token', async () => {
        userMock.findUnique.mockResolvedValue({
            ...(await existingUser('secret123')),
            tokenVersion: 7,
        })

        const res = await client()
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'secret123'})

        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as {
            tokenVersion: number
        }
        expect(decoded.tokenVersion).toBe(7)
    })

    it('never returns the password hash', async () => {
        userMock.findUnique.mockResolvedValue(await existingUser('secret123'))

        const res = await client()
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'secret123'})

        expect(res.body.user.password).toBeUndefined()
    })

    it('rejects a wrong password', async () => {
        userMock.findUnique.mockResolvedValue(await existingUser('secret123'))

        const res = await client()
            .post('/api/auth/login')
            .send({email: 'a@b.com', password: 'wrong-password'})

        expect(res.status).toBe(401)
    })

    it('returns the same error for an unknown email as for a wrong password', async () => {
        userMock.findUnique.mockResolvedValue(null)

        const res = await client()
            .post('/api/auth/login')
            .send({email: 'nobody@b.com', password: 'secret123'})

        expect(res.status).toBe(401)
        expect(res.body.error).toBe('Invalid credentials')
    })

    // The two answers have to cost the same as well as read the same. Skipping
    // the hash for an unknown address would return in about a millisecond
    // where a known one takes bcrypt's full time, and timing the two apart
    // tells an attacker which addresses are registered.
    it('still hashes when the email is unknown', async () => {
        userMock.findUnique.mockResolvedValue(null)
        const compare = vi.spyOn(bcrypt, 'compare')

        await client()
            .post('/api/auth/login')
            .send({email: 'nobody@b.com', password: 'secret123'})

        expect(compare).toHaveBeenCalledOnce()
        compare.mockRestore()
    })
})

describe('POST /api/auth/logout', () => {
    const auth = `Bearer ${jwt.sign({userId: 'user-1', tokenVersion: 0}, process.env.JWT_SECRET!)}`

    // Clearing the token in the browser only forgets it locally. Bumping the
    // version is what retires every copy of it that is still out there.
    it('moves the account past every token it has issued', async () => {
        userMock.update.mockResolvedValue({id: 'user-1', tokenVersion: 1})

        const res = await client().post('/api/auth/logout').set('Authorization', auth)

        expect(res.status).toBe(204)
        expect(userMock.update).toHaveBeenCalledWith({
            where: {id: 'user-1'},
            data: {tokenVersion: {increment: 1}},
        })
    })

    it('refuses without a token, so nobody can log anyone else out', async () => {
        const res = await client().post('/api/auth/logout')

        expect(res.status).toBe(401)
        expect(userMock.update).not.toHaveBeenCalled()
    })
})
