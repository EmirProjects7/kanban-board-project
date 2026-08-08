import jwt from 'jsonwebtoken'
import {z} from 'zod'

// jwt.verify hands back `any`, so the payload has to be checked rather than
// asserted. A token carrying no userId would otherwise leave req.userId
// undefined, and Prisma reads an undefined value in a `where` clause as no
// filter at all, which would turn the boards route into every board in the
// database.
//
// tokenVersion is optional because tokens signed before it existed do not
// carry one, and zero is where every account starts, so the two line up
// without logging anybody out on deploy.
const payloadSchema = z.object({
    userId: z.string().min(1),
    tokenVersion: z.number().int().nonnegative().optional(),
})

export type TokenClaims = {userId: string; tokenVersion: number}

// The algorithm is pinned so verification can only ever accept the one the
// tokens are signed with.
export function claimsFromToken(token: string): TokenClaims | null {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
            algorithms: ['HS256'],
        })
        const parsed = payloadSchema.safeParse(decoded)
        if (!parsed.success) return null
        return {
            userId: parsed.data.userId,
            tokenVersion: parsed.data.tokenVersion ?? 0,
        }
    } catch {
        return null
    }
}
