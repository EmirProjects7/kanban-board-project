import {useState} from 'react'
import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {CardDetail} from './CardDetail'
import type {Card as CardType} from '../types'

type CardProps = {
    card: CardType
    onDelete: (id: string) => void
    onEdit: (id: string, newTitle: string) => void
    onDescribe: (id: string, description: string) => void
}

function Card({card, onDelete, onEdit, onDescribe}: CardProps) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: card.id,
        data: {type: 'card'},
    })

    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(card.title)
    const [isOpen, setIsOpen] = useState(false)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const hasDescription = Boolean(card.description && card.description.trim())

    function handleSave() {
        const trimmed = editValue.trim()
        if (trimmed) {
            onEdit(card.id, trimmed)
        }
        setIsEditing(false)
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="card"
                tabIndex={0}
            >
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
                    <div className="card-body">
                        {/* Only the text opens the inline editor. Double
                            clicking the padding or the buttons used to start
                            a rename too. */}
                        <span className="card-title" onDoubleClick={() => setIsEditing(true)}>
                            {card.title}
                        </span>
                        {hasDescription && (
                            <span className="card-note" aria-label="Has a description">
                                ≡
                            </span>
                        )}
                    </div>
                )}
                <div className="card-actions">
                    <button
                        className="card-open-button"
                        onClick={() => setIsOpen(true)}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={`Open ${card.title}`}
                    >
                        ⤢
                    </button>
                    <button
                        className="delete-button"
                        onClick={() => onDelete(card.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        // Named after the card, so a screen reader does not
                        // read out a row of identical "Delete card" buttons.
                        aria-label={`Delete ${card.title}`}
                    >
                        ×
                    </button>
                </div>
            </div>

            {isOpen && (
                <CardDetail
                    card={card}
                    onSaveTitle={(title) => onEdit(card.id, title)}
                    onSaveDescription={(description) => onDescribe(card.id, description)}
                    onDelete={() => {
                        setIsOpen(false)
                        onDelete(card.id)
                    }}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    )
}

export default Card
