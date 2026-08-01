import {useState} from 'react'
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
    onEditColumn: (columnId: string, newTitle: string) => void
    onDeleteColumn: (columnId: string) => void
}

function Column({column, onAddCard, onDeleteCard, onEditCard, onEditColumn, onDeleteColumn}: ColumnProps) {
    // useSortable also registers the column as a drop target, so cards can
    // still be dropped into it, including while it is empty.
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: column.id,
        data: {type: 'column'},
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(column.title)

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
            <div className="column-header">
                {/* Dragging is limited to this handle so that editing the
                    title and dragging cards inside the column still work. */}
                <button
                    className="column-drag-handle"
                    aria-label={`Reorder column ${column.title}`}
                    {...attributes}
                    {...listeners}
                >
                    ⠿
                </button>
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
                        autoFocus
                        aria-label="Column title"
                    />
                ) : (
                    <h2 onDoubleClick={startEditing}>{column.title}</h2>
                )}
                <button className="delete-column-button" onClick={() => onDeleteColumn(column.id)} aria-label = "Delete column"> ×</button>
            </div>
            <div className="cards">
                <SortableContext
                    items={column.cards.map((card) => card.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.cards.map((card) => (
                        <Card key={card.id} id={card.id} title={card.title} onDelete={onDeleteCard}
                              onEdit={onEditCard}/>
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