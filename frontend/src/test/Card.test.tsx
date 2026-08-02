import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import Card from '../components/Card'

function renderCard(props: Partial<React.ComponentProps<typeof Card>> = {}) {
    const defaultProps = {
        id: 'card-1',
        title: 'Test Card',
        onDelete: () => {},
        onEdit: () => {},
        ...props,
    }
    return render(
        <DndContext>
            <Card {...defaultProps} />
        </DndContext>
    )
}

describe('Card', () => {
    it('renders the card title', () => {
        renderCard({ title: 'Buy groceries' })
        expect(screen.getByText('Buy groceries')).toBeInTheDocument()
    })

    it('calls onDelete when delete button is clicked', () => {
        let deletedId = ''
        renderCard({ id: 'card-42', onDelete: (id) => { deletedId = id } })
        fireEvent.click(screen.getByLabelText('Delete card'))
        expect(deletedId).toBe('card-42')
    })

    it('enters edit mode on double click', () => {
        renderCard({ title: 'Editable' })
        fireEvent.doubleClick(screen.getByText('Editable'))
        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
    })
})
describe('what opens the editor', () => {
    it('opens when the text itself is double clicked', () => {
        render(<Card id="card-1" title="Editable" onDelete={vi.fn()} onEdit={vi.fn()} />)

        fireEvent.doubleClick(screen.getByText('Editable'))

        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
    })

    it('stays shut when the card around the text is double clicked', () => {
        const {container} = render(
            <Card id="card-1" title="Editable" onDelete={vi.fn()} onEdit={vi.fn()} />
        )

        fireEvent.doubleClick(container.querySelector('.card')!)

        expect(screen.queryByDisplayValue('Editable')).not.toBeInTheDocument()
    })

    it('stays shut when the delete button is double clicked', () => {
        render(<Card id="card-1" title="Editable" onDelete={vi.fn()} onEdit={vi.fn()} />)

        fireEvent.doubleClick(screen.getByLabelText('Delete card'))

        expect(screen.queryByDisplayValue('Editable')).not.toBeInTheDocument()
    })
})
