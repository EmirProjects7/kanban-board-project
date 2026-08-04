import jwt from 'jsonwebtoken'
import {z} from 'zod'

// jwt.verify hands back `any`, so the payload has to be checked rather than
// asserted. A token carrying no userId would otherwise leave req.userId
// undefined, and Prisma reads an undefined value in a `where` clause as no
// filter at all, which would turn the boards route into every board in the
// database.
const payloadSchema = z.object({userId: z.string().min(1)})

// The algorithm is pinned so verification can only ever accept the one the
// tokens are signed with.
export function userIdFromToken(token: string): string | null {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
            algorithms: ['HS256'],
        })
        const parsed = payloadSchema.safeParse(decoded)
        return parsed.success ? parsed.data.userId : null
    } catch {
        return null
    }
}
