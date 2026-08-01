import {useState} from 'react'
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable'
import Card from './Card'
import AddCardForm from './AddCardForm'
import {useDroppable} from '@dnd-kit/core'
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
    const {setNodeRef} = useDroppable({id: column.id})
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(column.title)

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
        <div className="column" ref={setNodeRef}>
            <div className="column-header">
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