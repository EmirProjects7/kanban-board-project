import {describe, it, expect, vi} from 'vitest'
import jwt from 'jsonwebtoken'
import type {Request, Response} from 'express'
import {authenticate} from '../middleware/authenticate'

function mockRes() {
    const res: Partial<Response> = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res as Response
}

describe('authenticate', () => {
    it('rejects a request with no Authorization header', () => {
        const req = {headers: {}} as Request
        const res = mockRes()
        const next = vi.fn()

        authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('rejects a header that is not a Bearer token', () => {
        const req = {headers: {authorization: 'Basic abc123'}} as Request
        const res = mockRes()
        const next = vi.fn()

        authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('rejects an invalid token', () => {
        const req = {headers: {authorization: 'Bearer not-a-real-token'}} as Request
        const res = mockRes()
        const next = vi.fn()

        authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    it('accepts a valid token and sets req.userId', () => {
        const token = jwt.sign({userId: 'user-1'}, process.env.JWT_SECRET!)
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        authenticate(req, res, next)

        expect(req.userId).toBe('user-1')
        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('rejects a token signed with a different secret', () => {
        const token = jwt.sign({userId: 'user-1'}, 'wrong-secret')
        const req = {headers: {authorization: `Bearer ${token}`}} as Request
        const res = mockRes()
        const next = vi.fn()

        authenticate(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })
})
