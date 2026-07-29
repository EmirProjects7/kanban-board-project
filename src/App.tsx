import './App.css'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import {useBoard} from './useBoard';
import Column from './Column'


function App() {
    const {columns, activeCard, addCard, handleDragStart, handleDragEnd} = useBoard()

    return (
        <div className="app">
            <h1>Kanban Board</h1>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} >
            <div className="board">
                {/* function to map a column to its visualization, react requires a key*/}
                {columns.map((column) => (
                    <Column key={column.id} column={column} onAddCard={addCard} />
                ))}
            </div>

                <DragOverlay>
                    {activeCard ? (
                        <div className="card">{activeCard.title}</div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

export default App