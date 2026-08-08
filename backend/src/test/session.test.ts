import {describe, it, expect, vi, beforeEach} from 'vitest'
import {isTokenCurrent} from '../session'

const {userMock} = vi.hoisted(() => ({userMock: {findUnique: vi.fn()}}))
vi.mock('../prisma', () => ({prisma: {user: userMock}}))

beforeEach(() => {
    vi.clearAllMocks()
})

describe('isTokenCurrent', () => {
    it('accepts a token carrying the version the account is on', async () => {
        userMock.findUnique.mockResolvedValue({tokenVersion: 3})

        expect(await isTokenCurrent({userId: 'user-1', tokenVersion: 3})).toBe(true)
    })

    // What logging out does: the account moves on and every token signed
    // before it is left behind.
    it('rejects a token from before the account moved on', async () => {
        userMock.findUnique.mockResolvedValue({tokenVersion: 4})

        expect(await isTokenCurrent({userId: 'user-1', tokenVersion: 3})).toBe(false)
    })

    // A token signed before the field existed carries no version, which the
    // token module reads as zero, so an account still on zero keeps working.
    it('accepts version zero against an account that has never logged out', async () => {
        userMock.findUnique.mockResolvedValue({tokenVersion: 0})

        expect(await isTokenCurrent({userId: 'user-1', tokenVersion: 0})).toBe(true)
    })

    it('rejects a token for an account that no longer exists', async () => {
        userMock.findUnique.mockResolvedValue(null)

        expect(await isTokenCurrent({userId: 'deleted', tokenVersion: 0})).toBe(false)
    })

    it('reads only the version, never the password hash', async () => {
        userMock.findUnique.mockResolvedValue({tokenVersion: 0})

        await isTokenCurrent({userId: 'user-1', tokenVersion: 0})

        expect(userMock.findUnique).toHaveBeenCalledWith({
            where: {id: 'user-1'},
            select: {tokenVersion: true},
        })
    })
})
