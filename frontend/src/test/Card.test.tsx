import { describe, it, expect } from 'vitest'
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