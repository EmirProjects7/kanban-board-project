import {useState} from 'react'
import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {CardDetail} from './CardDetail'
import {formatDueDate, isOverdue, isToday} from '../dueDate'
import type {Card as CardType, Label, LabelColour} from '../types'

type CardProps = {
    card: CardType
    labels: Label[]
    onDelete: (id: string) => void
    onEdit: (id: string, newTitle: string) => void
    onDescribe: (id: string, description: string) => void
    onSetDueDate: (id: string, day: string) => void
    onToggleLabel: (cardId: string, labelId: string, attached: boolean) => void
    onCreateLabel: (name: string, colour: LabelColour) => void
}

function Card({
    card,
    labels,
    onDelete,
    onEdit,
    onDescribe,
    onSetDueDate,
    onToggleLabel,
    onCreateLabel,
}: CardProps) {
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
    const attached = (card.labels ?? []).map((entry) => entry.label)

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
                        {attached.length > 0 && (
                            <div className="card-labels">
                                {attached.map((label) => (
                                    <span
                                        key={label.id}
                                        className={`label-tag label-${label.colour}`}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="card-title-row">
                            {/* Only the text opens the inline editor. Double
                                clicking the padding or the buttons used to
                                start a rename too. */}
                            <span className="card-title" onDoubleClick={() => setIsEditing(true)}>
                                {card.title}
                            </span>
                            {hasDescription && (
                                <span className="card-note" aria-label="Has a description">
                                    ≡
                                </span>
                            )}
                        </div>
                        {card.dueDate && (
                            <span
                                className={
                                    isOverdue(card.dueDate)
                                        ? 'card-due is-overdue'
                                        : isToday(card.dueDate)
                                          ? 'card-due is-today'
                                          : 'card-due'
                                }
                                aria-label={
                                    isOverdue(card.dueDate)
                                        ? `Overdue, was due ${formatDueDate(card.dueDate)}`
                                        : `Due ${formatDueDate(card.dueDate)}`
                                }
                            >
                                {formatDueDate(card.dueDate)}
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
                    labels={labels}
                    onSaveTitle={(title) => onEdit(card.id, title)}
                    onSaveDescription={(description) => onDescribe(card.id, description)}
                    onSaveDueDate={(day) => onSetDueDate(card.id, day)}
                    onToggleLabel={(labelId, isAttached) =>
                        onToggleLabel(card.id, labelId, isAttached)
                    }
                    onCreateLabel={onCreateLabel}
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
