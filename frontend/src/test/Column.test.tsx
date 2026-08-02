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
        onDescribeCard: vi.fn(),
        onEditColumn: vi.fn(),
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
        fireEvent.click(screen.getByLabelText('Delete First'))
        expect(onDeleteCard).toHaveBeenCalledWith('card-1')
    })
})

describe('Column renaming', () => {
    function startEditing() {
        fireEvent.doubleClick(screen.getByRole('heading', {name: 'Todo'}))
        return screen.getByLabelText('Column title')
    }

    it('does not show the title input until the heading is double clicked', () => {
        renderColumn()
        expect(screen.queryByLabelText('Column title')).not.toBeInTheDocument()
    })

    it('opens an input holding the current title on double click', () => {
        renderColumn()
        expect(startEditing()).toHaveValue('Todo')
    })

    it('saves the new title on Enter', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: 'In Progress'}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onEditColumn).toHaveBeenCalledWith('col-1', 'In Progress')
    })

    it('saves the new title on blur', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: 'Done'}})
        fireEvent.blur(input)
        expect(onEditColumn).toHaveBeenCalledWith('col-1', 'Done')
    })

    it('trims whitespace around the new title', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: '  Done  '}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onEditColumn).toHaveBeenCalledWith('col-1', 'Done')
    })

    it('discards the edit on Escape', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: 'Discarded'}})
        fireEvent.keyDown(input, {key: 'Escape'})
        expect(onEditColumn).not.toHaveBeenCalled()
        expect(screen.getByRole('heading', {name: 'Todo'})).toBeInTheDocument()
    })

    it('ignores an empty title', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: '   '}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onEditColumn).not.toHaveBeenCalled()
    })

    it('does not call the handler when the title is unchanged', () => {
        const {onEditColumn} = renderColumn()
        const input = startEditing()
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onEditColumn).not.toHaveBeenCalled()
    })

    it('leaves edit mode after saving', () => {
        renderColumn()
        const input = startEditing()
        fireEvent.change(input, {target: {value: 'In Progress'}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(screen.queryByLabelText('Column title')).not.toBeInTheDocument()
    })
})
