import {prisma} from './prisma'
import {boardQuery} from './queries'
import {io} from './socket'

export async function emitBoard(userId: string) {
    const columns = await prisma.column.findMany(boardQuery(userId))
    io.to(userId).emit('board:updated', columns)
}
