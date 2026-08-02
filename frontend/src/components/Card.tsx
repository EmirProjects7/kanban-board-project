import {useState} from 'react'
import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'

type CardProps = {
    id: string
    title: string
    onDelete: (id: string) => void
    onEdit: (id: string, newTitle: string) => void
}

function Card({id, title, onDelete, onEdit}: CardProps) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: id,
        data: {type: 'card'},
    })

    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(title)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.4 : 1,
    }

    function handleSave() {
        const trimmed = editValue.trim()
        if (trimmed) {
            onEdit(id, trimmed)
        }
        setIsEditing(false)
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="card" tabIndex={0}>
            {isEditing ? (
                <input
                    className="card-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setIsEditing(false)
                    }}
                    autoFocus
                    onPointerDown={(e) => e.stopPropagation()}
                />
            ) : (
                // Only the text opens the editor. Double clicking the padding
                // or the delete button used to start a rename too.
                <span className="card-title" onDoubleClick={() => setIsEditing(true)}>
                    {title}
                </span>
            )}
            <button
                className="delete-button"
                onClick={() => onDelete(id)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Delete card"
            >
                ×
            </button>
        </div>
    )
}

export default Card