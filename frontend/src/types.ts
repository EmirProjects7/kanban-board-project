export const LABEL_COLOURS = ['grey', 'red', 'amber', 'green', 'blue', 'purple'] as const

export type LabelColour = (typeof LABEL_COLOURS)[number]

export type Label = {
    id: string
    name: string
    colour: LabelColour
}

export type Card = {
    id: string
    title: string
    description?: string | null
    // The API returns the join rows, each carrying its label.
    labels?: {label: Label}[]
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
