import {useState} from 'react'
import {arrayMove} from '@dnd-kit/sortable'
import type {DragEndEvent, DragStartEvent, DragOverEvent} from '@dnd-kit/core'
import type {Card, Column} from '../types'

export function useDragAndDrop(
    columns: Column[],
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>,
    saveBoard: (columns: Column[]) => void,
    isDraggingRef: React.RefObject<boolean>){
    const [activeCard, setActiveCard] = useState<Card | null>(null)
    const [activeColumn, setActiveColumn] = useState<Column | null>(null)

    function isColumnDrag(event: DragStartEvent | DragOverEvent | DragEndEvent) {
        return event.active.data.current?.type === 'column'
    }

    // A column drag can end over another column, or over one of the cards
    // inside it, so resolve whatever is underneath back to a column.
    function columnIndexFor(id: string) {
        const direct = columns.findIndex((col) => col.id === id)
        if (direct !== -1) return direct
        return columns.findIndex((col) => col.cards.some((c) => c.id === id))
    }

    function findColumns(activeId: string, overId: string) {
        const activeColumn = columns.find((col) => col.cards.some((c) => c.id === activeId))
        const overColumn = columns.find((col) =>
            col.cards.some((c) => c.id === overId) || col.id === overId)
        return {activeColumn, overColumn}
    }


    function handleDragStart(event: DragStartEvent) {
        isDraggingRef.current = true
        const {active} = event

        if (isColumnDrag(event)) {
            setActiveColumn(columns.find((col) => col.id === active.id) ?? null)
            return
        }

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
        // Columns only settle into place on drop, so nothing to preview here.
        if (isColumnDrag(event)) return

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
        const columnDrag = isColumnDrag(event)
        setActiveCard(null)
        setActiveColumn(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        if (columnDrag) {
            const oldIndex = columnIndexFor(activeId)
            const newIndex = columnIndexFor(overId)
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

            const reordered = arrayMove(columns, oldIndex, newIndex)
            setColumns(reordered)
            saveBoard(reordered)
            return
        }

        const sourceColumn = columns.find((col) =>
            col.cards.some((c) => c.id === activeId))
        const overColumn = columns.find((col) =>
            col.id === overId || col.cards.some((c) => c.id === overId))

        if (!sourceColumn || !overColumn) {
            saveBoard(columns)
            return
        }

        if (sourceColumn.id === overColumn.id) {

            setColumns((prevColumns) => {
                const newColumns = prevColumns.map((column) => {
                    if (column.id !== sourceColumn.id) return column
                    const oldIndex = column.cards.findIndex((c) => c.id === active.id)
                    const newIndex = column.cards.findIndex((c) => c.id === over.id)
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return column
                    return {...column, cards: arrayMove(column.cards, oldIndex, newIndex)}
                })
                saveBoard(newColumns)
                return newColumns
            })
        } else {
            // Cross-column moves are already reflected in `columns` by handleDragOver;
            // just persist the current state, same as the "no valid drop target" case above.
            saveBoard(columns)
        }
    }

    return {activeCard, activeColumn, handleDragStart, handleDragOver, handleDragEnd}
}