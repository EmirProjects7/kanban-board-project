import './App.css'
import {useState, useEffect, useMemo, useRef} from 'react'
import {DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core'
import {SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates} from '@dnd-kit/sortable'
import {useBoard} from './hooks/useBoard'
import {useBoards} from './hooks/useBoards'
import {useLabels} from './hooks/useLabels'
import {useDragAndDrop} from './hooks/useDragDrop'
import {LabelFilter} from './components/LabelFilter'
import {CardSearch} from './components/CardSearch'
import {countCards, visibleColumns as filterColumns} from './boardFilter'
import {isBlankQuery} from './search'
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
        retryLoad: retryBoards,
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
        retryLoad: retryBoard,
        isDraggingRef
    } = useBoard(activeBoardId)
    const {
        labels,
        addLabel,
        error: labelsError,
        dismissError: dismissLabelsError,
    } = useLabels(activeBoardId)
    const [filterIds, setFilterIds] = useState<Set<string>>(new Set())
    const [query, setQuery] = useState('')
    const [overdueOnly, setOverdueOnly] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)
    const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null

    const visibleColumns = useMemo(
        () => filterColumns(columns, {labelIds: filterIds, query, overdueOnly}),
        [columns, filterIds, query, overdueOnly]
    )

    const matchCount = useMemo(() => countCards(visibleColumns), [visibleColumns])

    // The columns handed to Column are the filtered ones, so their own counts
    // cannot say how big they really are. Looked up by id rather than by
    // position, since a filter never reorders but a drag does.
    const totalsById = useMemo(
        () => new Map(columns.map((column) => [column.id, column.cards.length])),
        [columns]
    )

    // Slash jumps to the search, the way it does in most things with one.
    // Ignored while the caret is already in a field, or the shortcut would eat
    // the slash out of a card title being typed.
    useEffect(() => {
        function focusSearch(event: KeyboardEvent) {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return

            const target = event.target as HTMLElement | null
            const editing =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target?.isContentEditable === true
            if (editing) return

            event.preventDefault()
            searchRef.current?.focus()
        }

        document.addEventListener('keydown', focusSearch)
        return () => document.removeEventListener('keydown', focusSearch)
    }, [])

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
                    {/* A load that failed leaves the board empty, which reads as
                        an empty account rather than a request that did not
                        arrive. Dismissing alone would leave that lie on screen,
                        so the ones that can be tried again offer it. */}
                    {(boardsError ?? error) && (
                        <button
                            className="board-error-retry"
                            onClick={boardsError ? retryBoards : retryBoard}
                        >
                            Try again
                        </button>
                    )}
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
            <CardSearch
                query={query}
                onChange={setQuery}
                matchCount={matchCount}
                inputRef={searchRef}
            />
            <LabelFilter
                labels={labels}
                activeIds={filterIds}
                onToggle={toggleFilter}
                overdueOnly={overdueOnly}
                onToggleOverdue={() => setOverdueOnly((on) => !on)}
                searching={!isBlankQuery(query)}
                onClear={() => {
                    setFilterIds(new Set())
                    setOverdueOnly(false)
                    setQuery('')
                }}
            />
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}>
                <div className="board">
                    {/* A new account arrives with a board and no columns, so
                        without this the first thing anyone sees is an empty
                        page and a lone form. Only for a board that really has
                        none: a search that hides every card is a different
                        thing, and the search bar already says so. */}
                    {columns.length === 0 && !error && (
                        <p className="board-empty">
                            Nothing here yet. Add a column to start.
                        </p>
                    )}
                    {/* function to map a column to its visualization, react requires a key*/}
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                        {visibleColumns.map((column) => (
                            <Column key={column.id} column={column} onAddCard={addCard}
                                    onDeleteCard={deleteCard} onEditCard={editCard} onDescribeCard={describeCard} onSetCardDueDate={setCardDueDate}
                                    labels={labels} onToggleCardLabel={toggleCardLabel}
                                    onCreateLabel={addLabel}
                                    onEditColumn={editColumn} onDeleteColumn={deleteColumn}
                                    totalCards={totalsById.get(column.id)}/>
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