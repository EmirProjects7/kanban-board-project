import {prisma} from './prisma'
import {columnsOfBoard} from './queries'
import {io} from './socket'

// Rooms stay per user, since that is who is watching, but the payload names
// the board so a client showing a different one can ignore it.
export async function emitBoard(userId: string, boardId: string) {
    const columns = await prisma.column.findMany(columnsOfBoard(boardId))
    io.to(userId).emit('board:updated', {boardId, columns})
}
