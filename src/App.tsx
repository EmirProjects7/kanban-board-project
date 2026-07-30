import './App.css'
import {DndContext, DragOverlay, PointerSensor,useSensor, useSensors} from '@dnd-kit/core'
import {useBoard} from './hooks/useBoard';
import Column from './components/Column'
import {useDragAndDrop} from "./hooks/useDragDrop.ts";


function App() {
    const {columns, setColumns, addCard, deleteCard, editCard} = useBoard()
    const {activeCard, handleDragStart, handleDragOver, handleDragEnd} = useDragAndDrop(columns, setColumns)
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}))
    return (
        <div className="app">
            <h1>Kanban Board</h1>
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <div className="board">
                    {/* function to map a column to its visualization, react requires a key*/}
                    {columns.map((column) => (
                        <Column key={column.id} column={column} onAddCard={addCard} onDeleteCard={deleteCard} onEditCard={editCard}/>
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