import {useState, useEffect} from 'react'
import {createPortal} from 'react-dom'
import type {Board} from '../types'

type BoardSwitcherProps = {
    boards: Board[]
    activeBoardId: string | null
    onSelect: (boardId: string) => void
    onAdd: (title: string) => void
    onRename: (boardId: string, title: string) => void
    onDelete: (boardId: string) => void
}

export function BoardSwitcher({
    boards,
    activeBoardId,
    onSelect,
    onAdd,
    onRename,
    onDelete,
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

                        <ul className="board-list">
                            {boards.map((board) => (
                                <li
                                    key={board.id}
                                    className="board-list-item"
                                    onContextMenu={(e) => {
                                        e.preventDefault()
                                        setMenuForId(board.id)
                                    }}
                                >
                                    {editingId === board.id ? (
                                        <input
                                            className="board-input"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => handleRename(board)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(board)
                                                if (e.key === 'Escape') setEditingId(null)
                                            }}
                                            aria-label="Board name"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <button
                                                className={
                                                    board.id === activeBoardId
                                                        ? 'board-name is-active'
                                                        : 'board-name'
                                                }
                                                onClick={() => handleSelect(board.id)}
                                            >
                                                {board.title}
                                            </button>
                                            <button
                                                className="board-menu-button"
                                                onClick={() => setMenuForId(board.id)}
                                                aria-label={`Options for ${board.title}`}
                                                aria-haspopup="menu"
                                            >
                                                <span aria-hidden="true">⋮</span>
                                            </button>

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
                                                            // The server refuses
                                                            // to delete the last
                                                            // board as well.
                                                            disabled={boards.length <= 1}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>

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
