import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import type {Board} from '../types'

type BoardRowProps = {
    board: Board
    isActive: boolean
    isEditing: boolean
    editValue: string
    onEditValueChange: (value: string) => void
    onCommitRename: () => void
    onCancelRename: () => void
    onSelect: () => void
    onOpenMenu: () => void
    children: React.ReactNode
}

export function BoardRow({
    board,
    isActive,
    isEditing,
    editValue,
    onEditValueChange,
    onCommitRename,
    onCancelRename,
    onSelect,
    onOpenMenu,
    children,
}: BoardRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: board.id,
        // Renaming puts a text field in the row, which cannot be dragged from.
        disabled: isEditing,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <li
            ref={setNodeRef}
            style={style}
            className="board-list-item"
            onContextMenu={(e) => {
                e.preventDefault()
                onOpenMenu()
            }}
        >
            {isEditing ? (
                <input
                    className="board-input"
                    value={editValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onBlur={onCommitRename}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onCommitRename()
                        if (e.key === 'Escape') onCancelRename()
                    }}
                    aria-label="Board name"
                    autoFocus
                />
            ) : (
                <>
                    {/* The name is both the way in and the drag handle. dnd-kit
                        waits for a few pixels of movement, so a plain click
                        still selects. Putting its attributes here rather than
                        on the row avoids a button nested inside a button. */}
                    <button
                        ref={setActivatorNodeRef}
                        className={isActive ? 'board-name is-active' : 'board-name'}
                        onClick={onSelect}
                        {...attributes}
                        {...listeners}
                    >
                        {board.title}
                    </button>
                    <button
                        className="board-menu-button"
                        onClick={onOpenMenu}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={`Options for ${board.title}`}
                        aria-haspopup="menu"
                    >
                        <span aria-hidden="true">⋮</span>
                    </button>
                    {children}
                </>
            )}
        </li>
    )
}
