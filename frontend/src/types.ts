export type Card = {
    id: string
    title: string
    description?: string | null
}

export type Column = {
    id: string
    title: string
    cards: Card[]
}

export type Board = {
    id: string
    title: string
    order: number
}
