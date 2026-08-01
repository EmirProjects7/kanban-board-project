import {prisma} from './prisma'
import {io} from './socket'

export async function emitBoard(userId: string) {
    const columns = await prisma.column.findMany({
        where: {userId: userId},
        include: {cards: {orderBy: {order: 'asc'}}},
    })
    io.to(userId).emit('board:updated', columns)
}
