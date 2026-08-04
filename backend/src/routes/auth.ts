import {Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {z} from 'zod'
import {prisma} from '../prisma'
import {Prisma} from '../generated/prisma/client'

const router = Router()

const credentialsSchema = z.object({
    email: z.email().max(255),
    password: z.string().min(5).max(100),
})

// Compared against when no user matches, so a miss costs the same as a hit.
// Returning early instead would answer an unknown address in about a
// millisecond and a known one in bcrypt's full time, and timing the two apart
// tells an attacker which addresses are registered.
const absentUserHash = bcrypt.hashSync('no user with this address', 10)

router.post('/register', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid email or password format'})
    }

    const {email, password} = parsed.data
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        // Created with a board, because the app has nowhere to put a column
        // otherwise and a new account would open onto a dead end.
        const user = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                boards: {create: {title: 'My Board', order: 0}},
            },
        })
        res.status(201).json({id: user.id, email: user.email})
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({error: 'Email already in use'})
        }
        console.error(error)
        res.status(500).json({error: 'Internal server error'})
    }
})

router.post('/login', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid credentials'})
    }

    const {email, password} = parsed.data
    const user = await prisma.user.findUnique({where: {email: email}})

    const passwordMatch = await bcrypt.compare(password, user?.password ?? absentUserHash)

    if (!user || !passwordMatch) {
        return res.status(401).json({error: 'Invalid credentials'})
    }

    const token = jwt.sign(
        {userId: user.id},
        process.env.JWT_SECRET!,
        {expiresIn: '7d'}
    )

    res.json({token: token, user: {id: user.id, email: user.email}})
})

export default router