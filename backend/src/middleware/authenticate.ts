import type { Request, Response, NextFunction } from 'express'
import {claimsFromToken} from '../token'
import {isTokenCurrent} from '../session'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }

    const claims = claimsFromToken(authHeader.split(' ')[1])

    if (!claims || !(await isTokenCurrent(claims))) {
        return res.status(401).json({ error: 'Invalid token' })
    }

    req.userId = claims.userId
    next()
}
