import {Prisma} from './generated/prisma/client'

// Single source of truth for how a board is read, so every route and the
// socket broadcast agree on column and card ordering. Kept apart from
// board.ts because that module performs the broadcast and gets mocked in
// tests, while this is a pure query shape that should not be.
export const columnsOfBoard = (boardId: string) =>
    ({
        where: {boardId: boardId},
        orderBy: {order: 'asc'},
        include: {cards: {orderBy: {order: 'asc'}}},
    }) satisfies Prisma.ColumnFindManyArgs

export const boardsOfUser = (userId: string) =>
    ({
        where: {userId: userId},
        orderBy: {order: 'asc'},
    }) satisfies Prisma.BoardFindManyArgs

// Ownership now runs through the board, so a column is only reachable when
// the board holding it belongs to the requesting user.
export const columnOwnedBy = (columnId: string, userId: string) =>
    ({
        where: {id: columnId, board: {userId: userId}},
    }) satisfies Prisma.ColumnFindFirstArgs

export const cardOwnedBy = (cardId: string, userId: string) =>
    ({
        where: {id: cardId, column: {board: {userId: userId}}},
    }) satisfies Prisma.CardFindFirstArgs

export const boardOwnedBy = (boardId: string, userId: string) =>
    ({
        where: {id: boardId, userId: userId},
    }) satisfies Prisma.BoardFindFirstArgs
