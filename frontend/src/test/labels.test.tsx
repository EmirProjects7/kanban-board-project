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
        onSetDueDate: () => {},
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
    function renderFilter(activeIds = new Set<string>(), overdueOnly = false) {
        const onToggle = vi.fn()
        const onClear = vi.fn()
        const onToggleOverdue = vi.fn()
        render(
            <LabelFilter
                labels={[bug, chore]}
                activeIds={activeIds}
                onToggle={onToggle}
                overdueOnly={overdueOnly}
                onToggleOverdue={onToggleOverdue}
                searching={false}
                onClear={onClear}
            />
        )
        return {onToggle, onClear, onToggleOverdue}
    }

    // The bar used to hide itself without labels. Overdue does not depend on
    // them, so it earns its place either way.
    it('offers overdue even when the board has no labels', () => {
        render(
            <LabelFilter
                labels={[]}
                activeIds={new Set()}
                onToggle={vi.fn()}
                overdueOnly={false}
                onToggleOverdue={vi.fn()}
                searching={false}
                onClear={vi.fn()}
            />
        )

        expect(screen.getByRole('button', {name: 'Overdue'})).toBeInTheDocument()
        expect(screen.queryByRole('button', {name: 'Bug'})).not.toBeInTheDocument()
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

describe('the overdue toggle', () => {
    function renderBar(overdueOnly = false, activeIds = new Set<string>()) {
        const onToggleOverdue = vi.fn()
        const onClear = vi.fn()
        render(
            <LabelFilter
                labels={[bug, chore]}
                activeIds={activeIds}
                onToggle={vi.fn()}
                overdueOnly={overdueOnly}
                onToggleOverdue={onToggleOverdue}
                searching={false}
                onClear={onClear}
            />
        )
        return {onToggleOverdue, onClear, button: screen.getByRole('button', {name: 'Overdue'})}
    }

    it('reports being off', () => {
        const {button} = renderBar()
        expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('reports being on', () => {
        const {button} = renderBar(true)
        expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('asks to be toggled', () => {
        const {button, onToggleOverdue} = renderBar()
        fireEvent.click(button)
        expect(onToggleOverdue).toHaveBeenCalledOnce()
    })

    // Clear has to reach every rule, or turning it off would leave the board
    // still narrowed with nothing on screen explaining why.
    it('brings out the clear button on its own', () => {
        renderBar(true)
        expect(screen.getByRole('button', {name: 'Clear'})).toBeInTheDocument()
    })

    it('leaves clear away when nothing is filtering', () => {
        renderBar(false)
        expect(screen.queryByRole('button', {name: 'Clear'})).not.toBeInTheDocument()
    })
})

describe('clearing every filter at once', () => {
    function renderBar(props: {activeIds?: Set<string>; overdueOnly?: boolean; searching?: boolean}) {
        const onClear = vi.fn()
        render(
            <LabelFilter
                labels={[bug, chore]}
                activeIds={props.activeIds ?? new Set()}
                onToggle={vi.fn()}
                overdueOnly={props.overdueOnly ?? false}
                onToggleOverdue={vi.fn()}
                searching={props.searching ?? false}
                onClear={onClear}
            />
        )
        return {onClear, clear: () => screen.queryByRole('button', {name: 'Clear'})}
    }

    it('offers nothing to clear when nothing is filtering', () => {
        expect(renderBar({}).clear()).not.toBeInTheDocument()
    })

    it('offers to clear a label', () => {
        expect(renderBar({activeIds: new Set(['label-1'])}).clear()).toBeInTheDocument()
    })

    it('offers to clear the overdue toggle', () => {
        expect(renderBar({overdueOnly: true}).clear()).toBeInTheDocument()
    })

    // Clear used to ignore the search, so pressing it reset the labels and left
    // the board narrowed with nothing on screen to explain why, and it did not
    // appear at all when the search was the only thing filtering.
    it('offers to clear a search on its own', () => {
        expect(renderBar({searching: true}).clear()).toBeInTheDocument()
    })
})
