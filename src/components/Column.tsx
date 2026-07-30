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
}

function Column({column, onAddCard, onDeleteCard, onEditCard}: ColumnProps) {
    const {setNodeRef} = useDroppable({id: column.id})
    return (
        <div className="column" ref={setNodeRef}>
            <h2>{column.title}</h2>
            <div className="cards">
                <SortableContext
                    items={column.cards.map((card) => card.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.cards.map((card) => (
                        <Card key={card.id} id={card.id} title={card.title} onDelete={onDeleteCard} onEdit={onEditCard}/>
                    ))}
                </SortableContext>
            </div>
            <AddCardForm onAdd={(title) => onAddCard(column.id, title)}/>
        </div>
    )
}

export default Column