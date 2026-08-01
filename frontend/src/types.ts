export type Card = {
    id: string
    title: string
}

export type Column = {
    id: string
    title: string
    cards: Card[]
}
