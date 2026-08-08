import {prisma} from './prisma'
import type {TokenClaims} from './token'

// A signature only says the token was issued by this server, not that it is
// still wanted. Tokens last a week, so logging out has to be able to retire
// one early: the account carries a version, every token carries the version it
// was signed with, and bumping the account's number leaves every token issued
// before it behind.
//
// Kept out of the middleware so the REST path and the socket handshake ask the
// same question in the same words, and so it can be tested on its own.
export async function isTokenCurrent(claims: TokenClaims): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: {id: claims.userId},
        select: {tokenVersion: true},
    })

    return user !== null && user.tokenVersion === claims.tokenVersion
}
