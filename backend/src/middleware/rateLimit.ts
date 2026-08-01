import rateLimit from 'express-rate-limit'

// Strict unless explicitly running in development, so a deployment that forgets
// to set NODE_ENV still gets the tight limit rather than the loose one.
const isDevelopment = process.env.NODE_ENV === 'development'

//brute force protection
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isDevelopment ? 200 : 10,
    message: {error: 'Too many attempts, please try again later'},
    standardHeaders: true,
    legacyHeaders: false,
})

//api max limit
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isDevelopment ? 5000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
})
