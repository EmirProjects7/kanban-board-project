import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {DndContext} from '@dnd-kit/core'
import Card from '../components/Card'
import type {Card as CardType} from '../types'

function renderCard(
    card: Partial<CardType> = {},
    handlers: Partial<{
        onDelete: (id: string) => void
        onEdit: (id: string, title: string) => void
        onDescribe: (id: string, description: string) => void
    }> = {}
) {
    const props = {
        card: {id: 'card-1', title: 'Test Card', ...card},
        onDelete: () => {},
        onEdit: () => {},
        onDescribe: () => {},
        ...handlers,
    }
    return render(
        <DndContext>
            <Card {...props} />
        </DndContext>
    )
}

describe('Card', () => {
    it('renders the card title', () => {
        renderCard({title: 'Buy groceries'})
        expect(screen.getByText('Buy groceries')).toBeInTheDocument()
    })

    it('calls onDelete when delete button is clicked', () => {
        let deletedId = ''
        renderCard({id: 'card-42', title: 'Doomed'}, {onDelete: (id) => {deletedId = id}})
        fireEvent.click(screen.getByLabelText('Delete Doomed'))
        expect(deletedId).toBe('card-42')
    })

    it('enters edit mode on double click', () => {
        renderCard({title: 'Editable'})
        fireEvent.doubleClick(screen.getByText('Editable'))
        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
    })
})

describe('what opens the editor', () => {
    it('opens when the text itself is double clicked', () => {
        renderCard({title: 'Editable'})

        fireEvent.doubleClick(screen.getByText('Editable'))

        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
    })

    it('stays shut when the card around the text is double clicked', () => {
        const {container} = renderCard({title: 'Editable'})

        fireEvent.doubleClick(container.querySelector('.card')!)

        expect(screen.queryByDisplayValue('Editable')).not.toBeInTheDocument()
    })

    it('stays shut when the delete button is double clicked', () => {
        renderCard({title: 'Editable'})

        fireEvent.doubleClick(screen.getByLabelText('Delete Editable'))

        expect(screen.queryByDisplayValue('Editable')).not.toBeInTheDocument()
    })
})

describe('the description marker', () => {
    it('is absent on a card without one', () => {
        renderCard({title: 'Plain'})
        expect(screen.queryByLabelText('Has a description')).not.toBeInTheDocument()
    })

    it('is absent when the description is only whitespace', () => {
        renderCard({title: 'Plain', description: '   '})
        expect(screen.queryByLabelText('Has a description')).not.toBeInTheDocument()
    })

    it('shows on a card that carries notes', () => {
        renderCard({title: 'Noted', description: 'Ring the supplier'})
        expect(screen.getByLabelText('Has a description')).toBeInTheDocument()
    })
})

describe('opening the card', () => {
    it('is closed to begin with', () => {
        renderCard({title: 'Task'})
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens from the expand button', () => {
        renderCard({title: 'Task'})
        fireEvent.click(screen.getByLabelText('Open Task'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('shows the existing description', () => {
        renderCard({title: 'Task', description: 'Ring the supplier'})
        fireEvent.click(screen.getByLabelText('Open Task'))
        expect(screen.getByLabelText('Description')).toHaveValue('Ring the supplier')
    })

    it('saves a description on blur', () => {
        const onDescribe = vi.fn()
        renderCard({id: 'card-7', title: 'Task'}, {onDescribe})
        fireEvent.click(screen.getByLabelText('Open Task'))

        const box = screen.getByLabelText('Description')
        fireEvent.change(box, {target: {value: 'Ring the supplier'}})
        fireEvent.blur(box)

        expect(onDescribe).toHaveBeenCalledWith('card-7', 'Ring the supplier')
    })

    it('does not save an unchanged description', () => {
        const onDescribe = vi.fn()
        renderCard({title: 'Task', description: 'Same'}, {onDescribe})
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.blur(screen.getByLabelText('Description'))

        expect(onDescribe).not.toHaveBeenCalled()
    })

    it('renames from the detail title', () => {
        const onEdit = vi.fn()
        renderCard({id: 'card-7', title: 'Task'}, {onEdit})
        fireEvent.click(screen.getByLabelText('Open Task'))

        const title = screen.getByLabelText('Card title')
        fireEvent.change(title, {target: {value: 'Renamed'}})
        fireEvent.blur(title)

        expect(onEdit).toHaveBeenCalledWith('card-7', 'Renamed')
    })

    it('refuses to save an emptied title', () => {
        const onEdit = vi.fn()
        renderCard({title: 'Task'}, {onEdit})
        fireEvent.click(screen.getByLabelText('Open Task'))

        const title = screen.getByLabelText('Card title')
        fireEvent.change(title, {target: {value: '   '}})
        fireEvent.blur(title)

        expect(onEdit).not.toHaveBeenCalled()
    })

    it('closes on Escape', () => {
        renderCard({title: 'Task'})
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.keyDown(window, {key: 'Escape'})

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes on the close button', () => {
        renderCard({title: 'Task'})
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.click(screen.getByLabelText('Close card'))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('deletes the card from the detail', () => {
        const onDelete = vi.fn()
        renderCard({id: 'card-7', title: 'Task'}, {onDelete})
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.click(screen.getByRole('button', {name: 'Delete card'}))

        expect(onDelete).toHaveBeenCalledWith('card-7')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
})
