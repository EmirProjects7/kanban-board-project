import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'

type CardProps = {
    /* card is being followed by dnd kit with its unique id*/
    id: string
    title: string
}

function Card({id, title}: CardProps) {
    const {attributes, listeners, setNodeRef, transform,transition, isDragging} = useSortable({id: id})

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div
            ref = {setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="card">
            {title}
        </div>
    )
}

export default Card