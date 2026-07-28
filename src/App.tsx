import { useState } from 'react'
import './App.css'
import AddCardForm from './AddCardForm'
import { DndContext } from '@dnd-kit/core'
import Card from './Card'

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

    return (
        <div className="app">
            <h1>Kanban Board</h1>
            <DndContext>
            <div className="board">
                {/* function to map a column to its visualization, react requires a key*/}
                {columns.map((column)=> (
                    <div className = "column" key ={column.id}>
                        <h2>{column.title}</h2>
                        <div className = "cards">
                            {/* visualizes all the cards inside a column, react requires a key */}
                            {column.cards.map((card)=> (
                                <Card key={card.id} title={card.title} />
                            ))}
                        </div>
                        <AddCardForm onAdd={(title) => addCard(column.id, title)}/>
                        </div>
                ))}
            </div>
            </DndContext>
        </div>
    )
}

export default App