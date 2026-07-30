import {useState} from 'react'
import {arrayMove} from '@dnd-kit/sortable'
import type {DragEndEvent, DragStartEvent, DragOverEvent} from '@dnd-kit/core'
import type {Card, Column} from './useBoard'

export function useDragAndDrop(
    columns: Column[],
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>) {
    const [activeCard, setActiveCard] = useState<Card | null>(null)

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

        if (!over) return
        if (active.id === over.id) return

        const activeColumn = columns.find((col) =>
            col.cards.some((c) => c.id === active.id))
        const overColumn = columns.find((col) =>
            col.cards.some((c) => c.id === over.id) || col.id === over.id)

        if (!activeColumn || !overColumn) return
        if (activeColumn.id !== overColumn.id) return

        setColumns((prevColumns) =>
            prevColumns.map((column) => {
                if (column.id !== activeColumn.id) return column
                const oldIndex = column.cards.findIndex((c) => c.id === active.id)
                const newIndex = column.cards.findIndex((c) => c.id === over.id)
                return {...column, cards: arrayMove(column.cards, oldIndex, newIndex)}
            })
        )
    }

    return {activeCard, handleDragStart, handleDragOver, handleDragEnd}
}