import {describe, it, expect, vi, beforeEach} from 'vitest'
import jwt from 'jsonwebtoken'
import type {Request, Response} from 'express'
import {authenticate} from '../middleware/authenticate'

const {isTokenCurrentMock} = vi.hoisted(() => ({isTokenCurrentMock: vi.fn()}))
vi.mock('../session', () => ({isTokenCurrent: isTokenCurrentMock}))

beforeEach(() => {
    isTokenCurrentMock.mockResolvedValue(true)
})

function mockRes() {
    const res: Partial<Response> = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res as Response
}

describe('authenticate', () => {
    it('rejects a request with no Authorization header', async () => {
        const req = {headers: {}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('rejects a header that is not a Bearer token', async () => {
        const req = {headers: {authorization: 'Basic abc123'}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('rejects an invalid token', async () => {
        const req = {headers: {authorization: 'Bearer not-a-real-token'}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('accepts a valid token and sets req.userId', async () => {
        const token = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(req.userId).toBe('user-1')
        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('rejects a token signed with a different secret', async () => {
        const token = jwt.sign({userId: 'user-1'}, 'wrong-secret')
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    // Without the payload check req.userId would be undefined here, and Prisma
    // reads an undefined `where` value as no filter, so the boards route would
    // answer with every board in the database.
    it('rejects a properly signed token that carries no user id', async () => {
        const token = jwt.sign({sub: 'user-1'}, process.env.JWT_SECRET!)
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(req.userId).toBeUndefined()
        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    // A week is a long time to be unable to take a session back, so the
    // signature being good is not the last word any more.
    it('rejects a properly signed token the account has since retired', async () => {
        isTokenCurrentMock.mockResolvedValue(false)
        const token = jwt.sign({userId: 'user-1', tokenVersion: 0}, process.env.JWT_SECRET!)
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('rejects a token signed with an algorithm the app does not use', async () => {
        const token = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!, {
            algorithm: 'HS512',
        })
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        await authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })
})
