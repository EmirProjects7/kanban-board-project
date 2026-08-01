import {Prisma} from './generated/prisma/client'

// Single source of truth for how a board is read, so every route and the
// socket broadcast agree on column and card ordering. Kept apart from
// board.ts because that module performs the broadcast and gets mocked in
// tests, while this is a pure query shape that should not be.
export const boardQuery = (userId: string) =>
    ({
        where: {userId: userId},
        orderBy: {order: 'asc'},
        include: {cards: {orderBy: {order: 'asc'}}},
    }) satisfies Prisma.ColumnFindManyArgs
