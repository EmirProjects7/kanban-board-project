import {useState} from 'react'
import {arrayMove} from '@dnd-kit/sortable'
import type {DragEndEvent, DragStartEvent, DragOverEvent} from '@dnd-kit/core'

export type Card = {
    id: string
    title: string
}

export type Column = {
    id: string
    title: string
    cards: Card[]
}

const initialColumns: Column[] = [
    {
        id: 'col-1',
        title: 'To Do',
        cards: [
            {id: 'card-1', title: 'Create Project'},
            {id: 'card-2', title: 'Generate Kanban'},
        ],
    },
    {
        id: 'col-2',
        title: 'In Progress',
        cards: [
            {id: 'card-3', title: 'Draw columns'},
        ],
    },
    {
        id: 'col-3',
        title: 'Done',
        cards: [
            {id: 'card-4', title: 'Load Node.js'},
            {id: 'card-5', title: 'Generate project'},
        ],
    },
]

export function useBoard() {
    const [columns, setColumns] = useState<Column[]>(initialColumns)
    const [activeCard, setActiveCard] = useState<Card | null>(null)

    function addCard(columnId: string, title: string) {
        const newCard: Card = {
            id: crypto.randomUUID(),
            title: title
        }
        setColumns(
            columns.map((column) =>
                column.id === columnId ? {...column, cards: [...column.cards, newCard]} : column
            )
        )
    }

    function deleteCard(cardId: string) {
        setColumns(columns.map((column) => ({
            ...column, cards: column.cards.filter((c) => c.id !== cardId)
        })))
    }

    //puts the dragged card into the state
    function handleDragStart(event: DragStartEvent) {
        const {active} = event
        for (const column of columns) {
            const card = column.cards.find((c) => c.id === active.id)
            if (card) {
                setActiveCard(card)
                return
            }
        }
    }

    function handleDragOver(event: DragOverEvent) {
        const {active, over} = event

        if (!over) return

        const activeColumn = columns.find((col) =>
            col.cards.some((c) => c.id === active.id))

        const overColumn = columns.find((col) =>
            col.cards.some((c) => c.id === over.id) || col.id === over.id)

        if (!activeColumn || !overColumn) return
        if (activeColumn.id === overColumn.id) return

        setColumns((prevColumns) => {
            const cardToMove = activeColumn.cards.find((c) => c.id === active.id)
            if (!cardToMove) return prevColumns

            return prevColumns.map((column) => {
                if (column.id === activeColumn.id) {
                    return {...column, cards: column.cards.filter((c) => c.id !== active.id)}
                }
                if (column.id === overColumn.id) {
                    const overIndex = column.cards.findIndex((c) => c.id === over.id)
                    const insertIndex = overIndex >= 0 ? overIndex : column.cards.length
                    const newCards = [...column.cards]
                    newCards.splice(insertIndex, 0, cardToMove)
                    return {...column, cards: newCards}
                }
                return column
            })
        })
    }

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event

        setActiveCard(null)

        if (!over) return;
        if (active.id === over.id) return;

        // Find columns of the dragged card and the target
        const activeColumn = columns.find((col) =>
            col.cards.some((c) => c.id === active.id))

        const overColumn = columns.find((col) =>
            col.cards.some((c) => c.id === over.id) || col.id === over.id)

        if (!activeColumn || !overColumn) return


        //inside same column
        if (activeColumn.id === overColumn.id) {
            setColumns((prevColumns) =>
                prevColumns.map((column) => {
                    if (column.id !== activeColumn.id) return column
                    const oldIndex = column.cards.findIndex((c) => c.id === active.id)
                    const newIndex = column.cards.findIndex((c) => c.id === over.id)
                    return {...column, cards: arrayMove(column.cards, oldIndex, newIndex)}
                })
            )
            return
        }


        //here implements the logic to move cards between boxes
        //removes from the source + adds to the target
        setColumns((prevColumns) => {
            const cardToMove = activeColumn.cards.find((c) => c.id === active.id)
            if (!cardToMove) return prevColumns

            return prevColumns.map((column) => {
                if (column.id === activeColumn.id) {
                    return {...column, cards: column.cards.filter((c) => c.id !== active.id)}
                }
                if (column.id === overColumn.id) {
                    const overIndex = column.cards.findIndex((c) => c.id === over.id)
                    const newCards = [...column.cards]
                    newCards.splice(overIndex, 0, cardToMove)
                    return {...column, cards: newCards}
                }
                return column
            })
        })
    }

    return {
        columns,
        activeCard,
        addCard,
        deleteCard,
        handleDragStart,
        handleDragOver,
        handleDragEnd
    }

}