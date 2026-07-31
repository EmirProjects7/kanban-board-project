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
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: id})

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
        <div ref={setNodeRef} style={style} className="card" onDoubleClick={() => setIsEditing(true)}>
            <button
                className="drag-handle"
                {...attributes}
                {...listeners}
                aria-label="Drag card"
            >
                ⠿
            </button>

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
                />
            ) : (
                <span className="card-title">{title}</span>
            )}

            <button
                className="delete-button"
                onClick={() => onDelete(id)}
                aria-label="Delete card"
            >
                ×
            </button>
        </div>
    )
}

export default Card