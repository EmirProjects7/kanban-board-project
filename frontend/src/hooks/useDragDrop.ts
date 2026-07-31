import {useState} from 'react'
import {arrayMove} from '@dnd-kit/sortable'
import type {DragEndEvent, DragStartEvent, DragOverEvent} from '@dnd-kit/core'
import type {Card, Column} from './useBoard'

export function useDragAndDrop(
    columns: Column[],
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>,
    saveBoard: (columns: Column[]) => void,
    isDraggingRef: React.MutableRefObject<boolean>){
    const [activeCard, setActiveCard] = useState<Card | null>(null)

    function findColumns(activeId: string, overId: string) {
        const activeColumn = columns.find((col) => col.cards.some((c) => c.id === activeId))
        const overColumn = columns.find((col) =>
            col.cards.some((c) => c.id === overId) || col.id === overId)
        return {activeColumn, overColumn}
    }


    function handleDragStart(event: DragStartEvent) {
        isDraggingRef.current = true
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

        const {activeColumn, overColumn} = findColumns(active.id as string, over.id as string)
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
        isDraggingRef.current = false
        const {active, over} = event
        setActiveCard(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const activeColumn = columns.find((col) =>
            col.cards.some((c) => c.id === activeId))
        const overColumn = columns.find((col) =>
            col.id === overId || col.cards.some((c) => c.id === overId))

        if (!activeColumn || !overColumn) {
            saveBoard(columns)
            return
        }

        if (activeColumn.id === overColumn.id) {

            setColumns((prevColumns) => {
                const newColumns = prevColumns.map((column) => {
                    if (column.id !== activeColumn.id) return column
                    const oldIndex = column.cards.findIndex((c) => c.id === active.id)
                    const newIndex = column.cards.findIndex((c) => c.id === over.id)
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return column
                    return {...column, cards: arrayMove(column.cards, oldIndex, newIndex)}
                })
                saveBoard(newColumns)
                return newColumns
            })
        } else {
            setColumns((prevColumns) => {
                saveBoard(prevColumns)
                return prevColumns
            })
        }
    }

    return {activeCard, handleDragStart, handleDragOver, handleDragEnd}
}