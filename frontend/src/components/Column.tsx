import {useState, useMemo} from 'react'
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import Card from './Card'
import AddCardForm from './AddCardForm'
import type {Column as ColumnType, Label, LabelColour} from '../types'


type ColumnProps = {
    column: ColumnType
    onAddCard: (columnId: string, title: string) => void
    onDeleteCard: (cardId: string) => void
    onEditCard: (cardId: string, newTitle: string) => void
    onDescribeCard: (cardId: string, description: string) => void
    onSetCardDueDate: (cardId: string, day: string) => void
    /** Every column on the board, for the move control in a card's detail. */
    columns: {id: string; title: string}[]
    onMoveCard: (cardId: string, columnId: string) => void
    /** The card that was just added, whose detail should open by itself. */
    openCardId?: string | null
    onCardDetailClosed?: () => void
    labels: Label[]
    onToggleCardLabel: (cardId: string, labelId: string, attached: boolean) => void
    onCreateLabel: (name: string, colour: LabelColour) => void
    onEditColumn: (columnId: string, newTitle: string) => void
    onDeleteColumn: (columnId: string) => void
    /** How many cards the column holds before any filter. */
    totalCards?: number
}

function Column({
    column,
    onAddCard,
    onDeleteCard,
    onEditCard,
    onDescribeCard,
    onSetCardDueDate,
    columns,
    onMoveCard,
    openCardId,
    onCardDetailClosed,
    labels,
    onToggleCardLabel,
    onCreateLabel,
    onEditColumn,
    onDeleteColumn,
    totalCards,
}: ColumnProps) {
    // useSortable also registers the column as a drop target, so cards can
    // still be dropped into it, including while it is empty.
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: column.id,
        data: {type: 'column'},
    })
    // Only worth saying when the two differ; an unfiltered board would
    // otherwise read "3 / 3" on every column.
    const hiding = totalCards !== undefined && totalCards > column.cards.length

    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(column.title)

    // dnd-kit compares this by reference to spot an order change and drops its
    // transitions when it sees one. Inline, that was every render, so the drag
    // animation never ran.
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
                {/* While a filter is on, the plain count is the filtered one,
                    and the column looks smaller than it is. Showing both keeps
                    the real size in view. aria-hidden because the cards are
                    right there to be counted. */}
                <span className="column-count" aria-hidden="true">
                    {hiding ? `${column.cards.length} / ${totalCards}` : column.cards.length}
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
                            onSetDueDate={onSetCardDueDate}
                            columns={columns}
                            columnId={column.id}
                            onMove={onMoveCard}
                            autoOpen={card.id === openCardId}
                            onDetailClosed={onCardDetailClosed}
                            labels={labels}
                            onToggleLabel={onToggleCardLabel}
                            onCreateLabel={onCreateLabel}
                        />
                    ))}
                    {column.cards.length === 0 && (
                        /* "No cards yet" would be a lie while a filter is on:
                           the column has cards, they are just not being shown.
                           Saying which it is stops someone hunting for work
                           they think has gone. */
                        <p className="empty-column">
                            {hiding ? 'No cards match' : 'No cards yet'}
                        </p>
                    )}
                </SortableContext>
            </div>
            <AddCardForm onAdd={(title) => onAddCard(column.id, title)}/>
        </div>
    )
}

export default Column