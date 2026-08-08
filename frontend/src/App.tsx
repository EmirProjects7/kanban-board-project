import './App.css'
import {useState, useEffect, useMemo} from 'react'
import {DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core'
import {SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates} from '@dnd-kit/sortable'
import {useBoard} from './hooks/useBoard'
import {useBoards} from './hooks/useBoards'
import {useLabels} from './hooks/useLabels'
import {useDragAndDrop} from './hooks/useDragDrop'
import {LabelFilter} from './components/LabelFilter'
import Column from './components/Column'
import AddColumnForm from './components/AddColumnForm'
import {BoardSwitcher} from './components/BoardSwitcher'
import {AuthForm} from './components/AuthForm'
import {clearToken, getToken, logout, setUnauthorizedHandler} from './api'
import {disconnectSocket} from './socket'


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken())
    const {
        boards,
        activeBoardId,
        selectBoard,
        addBoard,
        renameBoard,
        removeBoard,
        reorderBoards,
        error: boardsError,
        dismissError: dismissBoardsError,
    } = useBoards(isAuthenticated)
    const {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
        describeCard,
        setCardDueDate,
        toggleCardLabel,
        addColumn,
        editColumn,
        deleteColumn,
        saveBoard,
        error,
        dismissError,
        isDraggingRef
    } = useBoard(activeBoardId)
    const {
        labels,
        addLabel,
        error: labelsError,
        dismissError: dismissLabelsError,
    } = useLabels(activeBoardId)
    const [filterIds, setFilterIds] = useState<Set<string>>(new Set())
    const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null

    // Filtering hides cards from view only. The columns handed to drag and drop
    // stay whole, so a drop never reorders around cards that are out of sight.
    const visibleColumns = useMemo(() => {
        if (filterIds.size === 0) return columns
        return columns.map((column) => ({
            ...column,
            cards: column.cards.filter((card) =>
                (card.labels ?? []).some((entry) => filterIds.has(entry.label.id))
            ),
        }))
    }, [columns, filterIds])

    function toggleFilter(labelId: string) {
        setFilterIds((prev) => {
            const next = new Set(prev)
            if (next.has(labelId)) next.delete(labelId)
            else next.add(labelId)
            return next
        })
    }
    // Same reason as the card list in Column: a fresh array here reads to
    // dnd-kit as a reordered list and kills the drag animation.
    const columnIds = useMemo(() => columns.map((column) => column.id), [columns])
    const {activeCard, activeColumn, handleDragStart, handleDragOver, handleDragEnd} = useDragAndDrop(columns, setColumns, saveBoard, isDraggingRef)
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}))
    const [theme, setTheme] = useState<'light' | 'dark'>(
        () => (localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
    )

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    // The server call goes first, while the token is still in storage for the
    // request to carry. It retires the token rather than only forgetting it
    // here, so a copy taken off this machine stops working too. The local part
    // runs either way, since a user who pressed log out is logged out.
    async function handleLogout() {
        await logout()
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
                <BoardSwitcher
                    boards={boards}
                    activeBoardId={activeBoardId}
                    onSelect={selectBoard}
                    onAdd={addBoard}
                    onRename={renameBoard}
                    onDelete={removeBoard}
                    onReorder={reorderBoards}
                />
                <h1>{activeBoard?.title ?? 'Kanban Board'}</h1>
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
            {(boardsError ?? labelsError ?? error) && (
                <div className="board-error" role="alert">
                    <span>{boardsError ?? labelsError ?? error}</span>
                    <button
                        onClick={
                            boardsError
                                ? dismissBoardsError
                                : labelsError
                                  ? dismissLabelsError
                                  : dismissError
                        }
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}
            <LabelFilter
                labels={labels}
                activeIds={filterIds}
                onToggle={toggleFilter}
                onClear={() => setFilterIds(new Set())}
            />
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}>
                <div className="board">
                    {/* function to map a column to its visualization, react requires a key*/}
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                        {visibleColumns.map((column) => (
                            <Column key={column.id} column={column} onAddCard={addCard}
                                    onDeleteCard={deleteCard} onEditCard={editCard} onDescribeCard={describeCard} onSetCardDueDate={setCardDueDate}
                                    labels={labels} onToggleCardLabel={toggleCardLabel}
                                    onCreateLabel={addLabel}
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