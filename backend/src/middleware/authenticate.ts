import type { Request, Response, NextFunction } from 'express'
import {userIdFromToken} from '../token'

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }

    const userId = userIdFromToken(authHeader.split(' ')[1])

    if (!userId) {
        return res.status(401).json({ error: 'Invalid token' })
    }

    req.userId = userId
    next()
}
