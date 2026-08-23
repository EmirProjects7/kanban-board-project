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
        columns: {id: string; title: string}[]
        columnId: string
        onMove: (cardId: string, columnId: string) => void
    }> = {}
) {
    const props = {
        card: {id: 'card-1', title: 'Test Card', ...card},
        onDelete: () => {},
        onEdit: () => {},
        onDescribe: () => {},
        onSetDueDate: () => {},
        columns: [],
        columnId: 'column-1',
        onMove: () => {},
        labels: [],
        onToggleLabel: () => {},
        onCreateLabel: () => {},
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

    it('enters edit mode when the title text is double clicked', () => {
        renderCard({title: 'Editable'})
        fireEvent.doubleClick(screen.getByText('Editable'))
        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
    })
})

// Two double click targets a few pixels apart, so which one answers where is
// worth pinning down.
describe('what a double click does', () => {
    it('renames from the title text, and does not open the detail with it', () => {
        renderCard({title: 'Editable'})

        fireEvent.doubleClick(screen.getByText('Editable'))

        expect(screen.getByDisplayValue('Editable')).toBeInTheDocument()
        expect(screen.queryByLabelText('Card title')).not.toBeInTheDocument()
    })

    // The button in the corner is a small target, so the rest of the card
    // answers too, padding included.
    // Checked by class rather than by value: the detail carries a title field
    // of its own holding the same text, so a value lookup matches either one.
    it('opens the detail from the card around the text', () => {
        const {container} = renderCard({title: 'Editable'})

        fireEvent.doubleClick(container.querySelector('.card')!)

        expect(screen.getByLabelText('Card title')).toBeInTheDocument()
        expect(container.querySelector('.card-edit-input')).toBeNull()
    })

    it('still opens the detail from the button', () => {
        renderCard({title: 'Editable'})

        fireEvent.click(screen.getByLabelText('Open Editable'))

        expect(screen.getByLabelText('Card title')).toBeInTheDocument()
    })

    // Otherwise a quick second click on delete opens the card it just removed.
    it('does nothing when the delete button is double clicked', () => {
        const {container} = renderCard({title: 'Editable'})

        fireEvent.doubleClick(screen.getByLabelText('Delete Editable'))

        expect(screen.queryByLabelText('Card title')).not.toBeInTheDocument()
        expect(container.querySelector('.card-edit-input')).toBeNull()
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

describe('moving a card from the detail', () => {
    const columns = [
        {id: 'col-1', title: 'Todo'},
        {id: 'col-2', title: 'Doing'},
    ]

    it('offers every column, with the one the card is in selected', () => {
        renderCard({title: 'Task'}, {columns, columnId: 'col-2'})
        fireEvent.click(screen.getByLabelText('Open Task'))

        const picker = screen.getByLabelText('Column')
        expect(picker).toHaveValue('col-2')
        expect(screen.getByRole('option', {name: 'Todo'})).toBeInTheDocument()
        expect(screen.getByRole('option', {name: 'Doing'})).toBeInTheDocument()
    })

    it('moves the card to the column that is picked', () => {
        const onMove = vi.fn()
        renderCard({id: 'card-7', title: 'Task'}, {columns, columnId: 'col-1', onMove})
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.change(screen.getByLabelText('Column'), {target: {value: 'col-2'}})

        expect(onMove).toHaveBeenCalledWith('card-7', 'col-2')
    })

    // Nowhere to move to, so the control would only be one more thing to
    // read past.
    it('leaves the picker out on a board with a single column', () => {
        renderCard({title: 'Task'}, {columns: [columns[0]], columnId: 'col-1'})
        fireEvent.click(screen.getByLabelText('Open Task'))

        expect(screen.queryByLabelText('Column')).not.toBeInTheDocument()
    })
})
