import {useState, useEffect, useMemo} from 'react'
import {createPortal} from 'react-dom'
import {
    DndContext,
    PointerSensor,
    KeyboardSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type {DragEndEvent} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {BoardRow} from './BoardRow'
import type {Board} from '../types'

type BoardSwitcherProps = {
    boards: Board[]
    activeBoardId: string | null
    onSelect: (boardId: string) => void
    onAdd: (title: string) => void
    onRename: (boardId: string, title: string) => void
    onDelete: (boardId: string) => void
    onReorder: (boards: Board[]) => void
}

export function BoardSwitcher({
    boards,
    activeBoardId,
    onSelect,
    onAdd,
    onRename,
    onDelete,
    onReorder,
}: BoardSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [menuForId, setMenuForId] = useState<string | null>(null)

    // Escape backs out one layer at a time: the row menu first, then the drawer.
    useEffect(() => {
        if (!isOpen) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return
            setMenuForId((openFor) => {
                if (openFor) return null
                setIsOpen(false)
                return null
            })
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    function close() {
        setIsOpen(false)
        setIsAdding(false)
        setEditingId(null)
        setMenuForId(null)
    }

    // Switching boards leaves the drawer open, so several can be looked at in
    // a row. Closing it is the user's call.
    function handleSelect(boardId: string) {
        onSelect(boardId)
        setMenuForId(null)
    }

    function handleAdd() {
        const trimmed = newTitle.trim()
        if (!trimmed) return
        onAdd(trimmed)
        setNewTitle('')
        setIsAdding(false)
    }

    function startRenaming(board: Board) {
        setEditValue(board.title)
        setEditingId(board.id)
        setMenuForId(null)
    }

    function handleRename(board: Board) {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== board.title) {
            onRename(board.id, trimmed)
        }
        setEditingId(null)
    }

    function handleDelete(board: Board) {
        setMenuForId(null)
        onDelete(board.id)
    }

    // A few pixels of movement before a drag starts, so the buttons in each
    // row still take ordinary clicks.
    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    )

    // Stable identity, or dnd-kit reads it as a reordered list and drops the
    // animation.
    const boardIds = useMemo(() => boards.map((board) => board.id), [boards])

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event
        if (!over || active.id === over.id) return

        const from = boards.findIndex((board) => board.id === active.id)
        const to = boards.findIndex((board) => board.id === over.id)
        if (from === -1 || to === -1) return

        onReorder(arrayMove(boards, from, to))
    }

    return (
        <>
            <button
                className="menu-button"
                onClick={() => setIsOpen(true)}
                aria-label="Boards"
                aria-expanded={isOpen}
            >
                <span aria-hidden="true">☰</span>
            </button>

            {/* Rendered into the body: the header sets a backdrop-filter,
                which makes it the containing block for fixed children and
                would otherwise clip the drawer to the header's height. */}
            {isOpen && createPortal(
                <>
                    <div className="drawer-overlay" onClick={close} />
                    <aside className="drawer" aria-label="Boards">
                        <div className="drawer-header">
                            <h2>Boards</h2>
                            <button
                                className="drawer-close"
                                onClick={close}
                                aria-label="Close boards menu"
                            >
                                ×
                            </button>
                        </div>

                        {/* closestCenter rather than the default: the rows are
                            short and sit close together, and intersection
                            based detection kept finding nothing under the
                            item being moved. */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={boardIds}
                                strategy={verticalListSortingStrategy}
                            >
                                <ul className="board-list">
                                    {boards.map((board) => (
                                        <BoardRow
                                            key={board.id}
                                            board={board}
                                            isActive={board.id === activeBoardId}
                                            isEditing={editingId === board.id}
                                            editValue={editValue}
                                            onEditValueChange={setEditValue}
                                            onCommitRename={() => handleRename(board)}
                                            onCancelRename={() => setEditingId(null)}
                                            onSelect={() => handleSelect(board.id)}
                                            onOpenMenu={() => setMenuForId(board.id)}
                                        >
                                            {menuForId === board.id && (
                                                <>
                                                    {/* Closes the menu on any
                                                        click elsewhere without
                                                        racing the click that
                                                        opened it. */}
                                                    <div
                                                        className="row-menu-backdrop"
                                                        onClick={() => setMenuForId(null)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault()
                                                            setMenuForId(null)
                                                        }}
                                                    />
                                                    <div className="row-menu" role="menu">
                                                        <button
                                                            role="menuitem"
                                                            onClick={() => startRenaming(board)}
                                                        >
                                                            Rename
                                                        </button>
                                                        <button
                                                            role="menuitem"
                                                            className="row-menu-danger"
                                                            onClick={() => handleDelete(board)}
                                                            // The server refuses this too.
                                                            disabled={boards.length <= 1}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </BoardRow>
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>

                        {isAdding ? (
                            <div className="board-add">
                                <input
                                    className="board-input"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAdd()
                                        if (e.key === 'Escape') setIsAdding(false)
                                    }}
                                    placeholder="Board name"
                                    aria-label="New board name"
                                    autoFocus
                                />
                                <button className="board-action" onClick={handleAdd}>
                                    Create
                                </button>
                            </div>
                        ) : (
                            <button
                                className="board-action board-add-button"
                                onClick={() => setIsAdding(true)}
                            >
                                + New board
                            </button>
                        )}
                    </aside>
                </>,
                document.body
            )}
        </>
    )
}
