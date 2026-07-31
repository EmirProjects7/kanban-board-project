import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable'
import Card from './Card'
import AddCardForm from './AddCardForm'
import {useDroppable} from '@dnd-kit/core'
import type {Column as ColumnType} from '../hooks/useBoard'


type ColumnProps = {
    column: ColumnType
    onAddCard: (columnId: string, title: string) => void
    onDeleteCard: (cardId: string) => void
    onEditCard: (cardId: string, newTitle: string) => void
    onDeleteColumn: (columnId: string) => void
}

function Column({column, onAddCard, onDeleteCard, onEditCard, onDeleteColumn}: ColumnProps) {
    const {setNodeRef} = useDroppable({id: column.id})
    return (
        <div className="column" ref={setNodeRef}>
            <div className="column-header">
                <h2>{column.title}</h2>
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