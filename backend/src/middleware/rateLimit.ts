import rateLimit from 'express-rate-limit'

//brute force protection
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {error: 'Too many attempts, please try again later'},
    standardHeaders: true,
    legacyHeaders: false,
})

//api max limit
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
})