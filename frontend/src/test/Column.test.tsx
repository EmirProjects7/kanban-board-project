import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {DndContext} from '@dnd-kit/core'
import Column from '../components/Column'
import type {Column as ColumnType} from '../types'

const column: ColumnType = {
    id: 'col-1',
    title: 'Todo',
    cards: [
        {id: 'card-1', title: 'First'},
        {id: 'card-2', title: 'Second'},
    ],
}

function renderColumn(override: Partial<ColumnType> = {}) {
    const handlers = {
        onAddCard: vi.fn(),
        onDeleteCard: vi.fn(),
        onEditCard: vi.fn(),
        onDeleteColumn: vi.fn(),
    }
    render(
        <DndContext>
            <Column column={{...column, ...override}} {...handlers} />
        </DndContext>
    )
    return handlers
}

describe('Column', () => {
    it('renders the column title', () => {
        renderColumn()
        expect(screen.getByRole('heading', {name: 'Todo'})).toBeInTheDocument()
    })

    it('renders every card in the column', () => {
        renderColumn()
        expect(screen.getByText('First')).toBeInTheDocument()
        expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('shows a placeholder when the column is empty', () => {
        renderColumn({cards: []})
        expect(screen.getByText('No cards yet')).toBeInTheDocument()
    })

    it('hides the placeholder when the column has cards', () => {
        renderColumn()
        expect(screen.queryByText('No cards yet')).not.toBeInTheDocument()
    })

    it('passes the column id when adding a card', () => {
        const {onAddCard} = renderColumn()
        fireEvent.change(screen.getByPlaceholderText('New card...'), {
            target: {value: 'Third'},
        })
        fireEvent.click(screen.getByRole('button', {name: '+ Add'}))
        expect(onAddCard).toHaveBeenCalledWith('col-1', 'Third')
    })

    it('deletes the column by id', () => {
        const {onDeleteColumn} = renderColumn()
        fireEvent.click(screen.getByLabelText('Delete column'))
        expect(onDeleteColumn).toHaveBeenCalledWith('col-1')
    })

    it('forwards a card deletion by card id', () => {
        const {onDeleteCard} = renderColumn()
        fireEvent.click(screen.getAllByLabelText('Delete card')[0])
        expect(onDeleteCard).toHaveBeenCalledWith('card-1')
    })
})
