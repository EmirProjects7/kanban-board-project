import './App.css'
import {useState, useEffect} from 'react'
import {DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core'
import {SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates} from '@dnd-kit/sortable'
import {useBoard} from './hooks/useBoard'
import {useDragAndDrop} from './hooks/useDragDrop'
import Column from './components/Column'
import AddColumnForm from './components/AddColumnForm'
import {AuthForm} from './components/AuthForm'
import {clearToken, getToken, setUnauthorizedHandler} from './api'
import {disconnectSocket} from './socket'


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken())
    const {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
        addColumn,
        editColumn,
        deleteColumn,
        saveBoard,
        error,
        dismissError,
        isDraggingRef
    } = useBoard(isAuthenticated)
    const {activeCard, activeColumn, handleDragStart, handleDragOver, handleDragEnd} = useDragAndDrop(columns, setColumns, saveBoard, isDraggingRef)
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}))
    const [theme, setTheme] = useState<'light' | 'dark'>(
        () => (localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
    )

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    function handleLogout() {
        clearToken()
        disconnectSocket()
        setIsAuthenticated(false)
    }

    // An expired session should land on the login screen rather than on a
    // board whose every write quietly fails.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            disconnectSocket()
            setIsAuthenticated(false)
        })
        return () => setUnauthorizedHandler(null)
    }, [])

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
            {error && (
                <div className="board-error" role="alert">
                    <span>{error}</span>
                    <button onClick={dismissError} aria-label="Dismiss error">
                        ×
                    </button>
                </div>
            )}
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}>
                <div className="board">
                    {/* function to map a column to its visualization, react requires a key*/}
                    <SortableContext
                        items={columns.map((column) => column.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {columns.map((column) => (
                            <Column key={column.id} column={column} onAddCard={addCard}
                                    onDeleteCard={deleteCard} onEditCard={editCard}
                                    onEditColumn={editColumn} onDeleteColumn={deleteColumn}/>
                        ))}
                    </SortableContext>
                    <AddColumnForm onAdd={addColumn}/>
                </div>

                <DragOverlay>
                    {activeColumn ? (
                        <div className="column column-drag-preview">
                            <div className="column-header">
                                <h2>{activeColumn.title}</h2>
                            </div>
                        </div>
                    ) : activeCard ? (
                        <div className="card">{activeCard.title}</div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

export default App