import './App.css'
import {DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core'
import {useBoard} from './hooks/useBoard';
import Column from './components/Column'
import {useDragAndDrop} from "./hooks/useDragDrop.ts";
import AddColumnForm from "./components/AddColumnForm.tsx";
import {useState, useEffect} from 'react'
import {clearToken, getToken} from "./api.ts";
import {AuthForm} from "./components/AuthForm.tsx";
import {disconnectSocket} from "./socket.ts";
import {sortableKeyboardCoordinates} from '@dnd-kit/sortable'


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken())
    const {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
        addColumn,
        deleteColumn,
        saveBoard
    } = useBoard(isAuthenticated)
    const {activeCard, handleDragStart, handleDragOver, handleDragEnd} = useDragAndDrop(columns, setColumns, saveBoard)
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}))
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    function handleLogout() {
        clearToken()
        disconnectSocket()
        setIsAuthenticated(false)
    }

    if (!isAuthenticated) {
        return <AuthForm onAuthSuccess={() => setIsAuthenticated(true)}/>
    }

    return (
        <div className="app">
            <div className="app-header">
                <h1>Kanban Board</h1>
                <button
                    className="theme-toggle"
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <button className="logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div>
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}>
                <div className="board">
                    {/* function to map a column to its visualization, react requires a key*/}
                    {columns.map((column) => (
                        <Column key={column.id} column={column} onAddCard={addCard}
                                onDeleteCard={deleteCard} onEditCard={editCard} onDeleteColumn={deleteColumn}/>
                    ))}
                    <AddColumnForm onAdd={addColumn}/>
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