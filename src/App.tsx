import { useState } from 'react'
import './App.css'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Column from './Column'

type Card = {
    id: string
    title: string
}

type Column = {
    id: string
    title: string
    cards: Card[]
}


function App() {
    const [columns, setColumns] = useState<Column[]>([
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
    ])

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

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event
        console.log('over.id:', over?.id)

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
            const activeCard = activeColumn.cards.find((c) => c.id === active.id)
            if (!activeCard) return prevColumns

            return prevColumns.map((column) => {
                if (column.id === activeColumn.id) {
                    return {...column, cards: column.cards.filter((c) => c.id !== active.id)}
                }
                if (column.id === overColumn.id) {
                    const overIndex = column.cards.findIndex((c) => c.id === over.id)
                    const newCards = [...column.cards]
                    newCards.splice(overIndex, 0, activeCard)
                    return {...column, cards: newCards}
                }
                return column
            })
        })
    }

    return (
        <div className="app">
            <h1>Kanban Board</h1>
            <DndContext onDragEnd={handleDragEnd}>
            <div className="board">
                {/* function to map a column to its visualization, react requires a key*/}
                {columns.map((column) => (
                    <Column key={column.id} column={column} onAddCard={addCard} />
                ))}
            </div>
            </DndContext>
        </div>
    )
}

export default App