import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {DndContext} from '@dnd-kit/core'
import Card from '../components/Card'
import {LabelFilter} from '../components/LabelFilter'
import type {Card as CardType, Label} from '../types'

const bug: Label = {id: 'label-1', name: 'Bug', colour: 'red'}
const chore: Label = {id: 'label-2', name: 'Chore', colour: 'blue'}

function renderCard(
    card: Partial<CardType> = {},
    handlers: Partial<{
        onToggleLabel: (cardId: string, labelId: string, attached: boolean) => void
        onCreateLabel: (name: string, colour: string) => void
    }> = {},
    labels: Label[] = [bug, chore]
) {
    const props = {
        card: {id: 'card-1', title: 'Task', ...card},
        labels,
        onDelete: () => {},
        onEdit: () => {},
        onDescribe: () => {},
        onToggleLabel: () => {},
        onCreateLabel: () => {},
        ...handlers,
    }
    render(
        <DndContext>
            <Card {...props} />
        </DndContext>
    )
}

describe('labels on the card', () => {
    it('shows nothing on a card without labels', () => {
        renderCard()
        expect(screen.queryByText('Bug')).not.toBeInTheDocument()
    })

    it('shows a tag for each attached label', () => {
        renderCard({labels: [{label: bug}, {label: chore}]})
        expect(screen.getByText('Bug')).toBeInTheDocument()
        expect(screen.getByText('Chore')).toBeInTheDocument()
    })

    it('colours the tag from the label', () => {
        renderCard({labels: [{label: bug}]})
        expect(screen.getByText('Bug')).toHaveClass('label-red')
    })
})

describe('choosing labels in the detail', () => {
    function open() {
        fireEvent.click(screen.getByLabelText('Open Task'))
    }

    it('offers every label on the board', () => {
        renderCard()
        open()
        expect(screen.getByRole('button', {name: 'Bug'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Chore'})).toBeInTheDocument()
    })

    it('marks the ones already attached', () => {
        renderCard({labels: [{label: bug}]})
        open()
        expect(screen.getByRole('button', {name: 'Bug'})).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', {name: 'Chore'})).toHaveAttribute(
            'aria-pressed',
            'false'
        )
    })

    it('attaches a label that is off', () => {
        const onToggleLabel = vi.fn()
        renderCard({id: 'card-7'}, {onToggleLabel})
        open()

        fireEvent.click(screen.getByRole('button', {name: 'Bug'}))

        expect(onToggleLabel).toHaveBeenCalledWith('card-7', 'label-1', false)
    })

    it('detaches a label that is on', () => {
        const onToggleLabel = vi.fn()
        renderCard({id: 'card-7', labels: [{label: bug}]}, {onToggleLabel})
        open()

        fireEvent.click(screen.getByRole('button', {name: 'Bug'}))

        expect(onToggleLabel).toHaveBeenCalledWith('card-7', 'label-1', true)
    })

    it('says so when the board has none yet', () => {
        renderCard({}, {}, [])
        open()
        expect(screen.getByText('No labels on this board yet.')).toBeInTheDocument()
    })

    it('creates a label with the chosen colour', () => {
        const onCreateLabel = vi.fn()
        renderCard({}, {onCreateLabel})
        open()

        fireEvent.click(screen.getByRole('button', {name: '+ New label'}))
        fireEvent.change(screen.getByLabelText('New label name'), {
            target: {value: 'Urgent'},
        })
        fireEvent.click(screen.getByRole('radio', {name: 'amber'}))
        fireEvent.click(screen.getByRole('button', {name: 'Add'}))

        expect(onCreateLabel).toHaveBeenCalledWith('Urgent', 'amber')
    })

    it('ignores an empty label name', () => {
        const onCreateLabel = vi.fn()
        renderCard({}, {onCreateLabel})
        open()

        fireEvent.click(screen.getByRole('button', {name: '+ New label'}))
        fireEvent.keyDown(screen.getByLabelText('New label name'), {key: 'Enter'})

        expect(onCreateLabel).not.toHaveBeenCalled()
    })
})

describe('the filter bar', () => {
    function renderFilter(activeIds = new Set<string>()) {
        const onToggle = vi.fn()
        const onClear = vi.fn()
        render(
            <LabelFilter
                labels={[bug, chore]}
                activeIds={activeIds}
                onToggle={onToggle}
                onClear={onClear}
            />
        )
        return {onToggle, onClear}
    }

    it('stays out of the way when the board has no labels', () => {
        render(
            <LabelFilter labels={[]} activeIds={new Set()} onToggle={vi.fn()} onClear={vi.fn()} />
        )
        expect(screen.queryByRole('group')).not.toBeInTheDocument()
    })

    it('offers each label', () => {
        renderFilter()
        expect(screen.getByRole('button', {name: 'Bug'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Chore'})).toBeInTheDocument()
    })

    it('reports a label being switched on', () => {
        const {onToggle} = renderFilter()
        fireEvent.click(screen.getByRole('button', {name: 'Bug'}))
        expect(onToggle).toHaveBeenCalledWith('label-1')
    })

    it('marks the ones in use', () => {
        renderFilter(new Set(['label-1']))
        expect(screen.getByRole('button', {name: 'Bug'})).toHaveAttribute('aria-pressed', 'true')
    })

    it('offers a way out only once something is filtered', () => {
        renderFilter()
        expect(screen.queryByRole('button', {name: 'Clear'})).not.toBeInTheDocument()
    })

    it('clears the filter', () => {
        const {onClear} = renderFilter(new Set(['label-1']))
        fireEvent.click(screen.getByRole('button', {name: 'Clear'}))
        expect(onClear).toHaveBeenCalledOnce()
    })
})
