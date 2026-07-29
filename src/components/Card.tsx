import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'

type CardProps = {
    /* card is being followed by dnd kit with its unique id*/
    id: string
    title: string
    onDelete: (id: string) => void
}

function Card({id, title, onDelete}: CardProps) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: id})

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="card">
            {title}
            <button
                className="delete-button"
                onClick={() => onDelete(id)}
                onPointerDown={(e) => e.stopPropagation()}>
                ×
            </button>
        </div>
    )
}

export default Card