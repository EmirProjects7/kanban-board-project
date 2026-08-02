import {useState, useMemo} from 'react'
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import Card from './Card'
import AddCardForm from './AddCardForm'
import type {Column as ColumnType} from '../types'


type ColumnProps = {
    column: ColumnType
    onAddCard: (columnId: string, title: string) => void
    onDeleteCard: (cardId: string) => void
    onEditCard: (cardId: string, newTitle: string) => void
    onDescribeCard: (cardId: string, description: string) => void
    onEditColumn: (columnId: string, newTitle: string) => void
    onDeleteColumn: (columnId: string) => void
}

function Column({
    column,
    onAddCard,
    onDeleteCard,
    onEditCard,
    onDescribeCard,
    onEditColumn,
    onDeleteColumn,
}: ColumnProps) {
    // useSortable also registers the column as a drop target, so cards can
    // still be dropped into it, including while it is empty.
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: column.id,
        data: {type: 'column'},
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(column.title)

    // dnd-kit compares this list by reference to decide whether the order
    // changed underneath it, and turns off its transitions for a frame when it
    // thinks it did. Building it inline handed it a new array on every render,
    // so the animation was permanently off and cards snapped into place.
    const cardIds = useMemo(() => column.cards.map((card) => card.id), [column.cards])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.4 : 1,
    }

    function handleSave() {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== column.title) {
            onEditColumn(column.id, trimmed)
        }
        setIsEditing(false)
    }

    function startEditing() {
        setEditValue(column.title)
        setIsEditing(true)
    }

    return (
        <div className="column" ref={setNodeRef} style={style}>
            {/* The whole header is the drag handle. The controls inside it
                stop the pointer event so renaming and deleting still work. */}
            <div
                className="column-header"
                aria-label={`Reorder column ${column.title}`}
                {...attributes}
                {...listeners}
            >
                {isEditing ? (
                    <input
                        className="column-title-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') setIsEditing(false)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        autoFocus
                        aria-label="Column title"
                    />
                ) : (
                    <h2 onDoubleClick={startEditing}>{column.title}</h2>
                )}
                <span className="column-count" aria-hidden="true">
                    {column.cards.length}
                </span>
                <button
                    className="delete-column-button"
                    onClick={() => onDeleteColumn(column.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Delete column"
                >
                    ×
                </button>
            </div>
            <div className="cards">
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {column.cards.map((card) => (
                        <Card
                            key={card.id}
                            card={card}
                            onDelete={onDeleteCard}
                            onEdit={onEditCard}
                            onDescribe={onDescribeCard}
                        />
                    ))}
                    {column.cards.length === 0 && (<p className="empty-column">No cards yet</p>
                    )}
                </SortableContext>
            </div>
            <AddCardForm onAdd={(title) => onAddCard(column.id, title)}/>
        </div>
    )
}

export default Column