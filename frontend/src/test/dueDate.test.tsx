import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {DndContext} from '@dnd-kit/core'
import Card from '../components/Card'
import {toInputValue, isOverdue, isToday, formatDueDate} from '../dueDate'
import type {Card as CardType} from '../types'

function renderCard(
    card: Partial<CardType> = {},
    onSetDueDate: (id: string, day: string) => void = () => {}
) {
    render(
        <DndContext>
            <Card
                card={{id: 'card-1', title: 'Task', ...card}}
                labels={[]}
                onDelete={() => {}}
                onEdit={() => {}}
                onDescribe={() => {}}
                onSetDueDate={onSetDueDate}
                onToggleLabel={() => {}}
                onCreateLabel={() => {}}
            />
        </DndContext>
    )
}

// The API sends an instant at UTC midnight. Reading it with local getters
// would show the day before for anyone behind Greenwich, so these pin the
// behaviour down.
describe('reading the day out of what the API sent', () => {
    it('keeps the day the server stored', () => {
        expect(toInputValue('2026-08-05T00:00:00.000Z')).toBe('2026-08-05')
    })

    it('has nothing to show for a card without a date', () => {
        expect(toInputValue(null)).toBe('')
        expect(toInputValue(undefined)).toBe('')
    })

    it('shrugs off a value it cannot parse', () => {
        expect(toInputValue('not a date')).toBe('')
    })
})

describe('deciding what is late', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        // Late evening, so a naive local reading would already roll the date
        // forward in eastern timezones.
        vi.setSystemTime(new Date('2026-08-10T21:30:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('counts a day before today as overdue', () => {
        expect(isOverdue('2026-08-09T00:00:00.000Z')).toBe(true)
    })

    it('does not count today as overdue', () => {
        expect(isOverdue('2026-08-10T00:00:00.000Z')).toBe(false)
    })

    it('does not count a future day as overdue', () => {
        expect(isOverdue('2026-08-11T00:00:00.000Z')).toBe(false)
    })

    it('has no opinion when there is no date', () => {
        expect(isOverdue(null)).toBe(false)
    })

    it('recognises today', () => {
        expect(isToday('2026-08-10T00:00:00.000Z')).toBe(true)
        expect(isToday('2026-08-11T00:00:00.000Z')).toBe(false)
    })
})

describe('the label on the badge', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-10T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('leaves the year off when it is this one', () => {
        expect(formatDueDate('2026-08-05T00:00:00.000Z')).toBe('5 Aug')
    })

    it('spells the year out when it is another', () => {
        expect(formatDueDate('2027-01-02T00:00:00.000Z')).toBe('2 Jan 2027')
    })

    it('has nothing to say without a date', () => {
        expect(formatDueDate(null)).toBe('')
    })
})

describe('the badge on the card', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-10T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('is absent on a card without a date', () => {
        renderCard()
        expect(screen.queryByText('5 Aug')).not.toBeInTheDocument()
    })

    it('shows the day', () => {
        renderCard({dueDate: '2026-08-20T00:00:00.000Z'})
        expect(screen.getByText('20 Aug')).toBeInTheDocument()
    })

    it('marks a date that has passed', () => {
        renderCard({dueDate: '2026-08-01T00:00:00.000Z'})
        expect(screen.getByText('1 Aug')).toHaveClass('is-overdue')
    })

    it('marks today without calling it late', () => {
        renderCard({dueDate: '2026-08-10T00:00:00.000Z'})
        const badge = screen.getByText('10 Aug')
        expect(badge).toHaveClass('is-today')
        expect(badge).not.toHaveClass('is-overdue')
    })

    it('says out loud that a card is overdue', () => {
        renderCard({dueDate: '2026-08-01T00:00:00.000Z'})
        expect(screen.getByLabelText('Overdue, was due 1 Aug')).toBeInTheDocument()
    })
})

describe('setting the date from the card', () => {
    it('shows the current date in the field', () => {
        renderCard({dueDate: '2026-08-05T00:00:00.000Z'})
        fireEvent.click(screen.getByLabelText('Open Task'))
        expect(screen.getByLabelText('Due date')).toHaveValue('2026-08-05')
    })

    it('reports the day that was picked', () => {
        const onSetDueDate = vi.fn()
        renderCard({id: 'card-7'}, onSetDueDate)
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.change(screen.getByLabelText('Due date'), {
            target: {value: '2026-09-01'},
        })

        expect(onSetDueDate).toHaveBeenCalledWith('card-7', '2026-09-01')
    })

    it('offers no way to clear a date that is not set', () => {
        renderCard()
        fireEvent.click(screen.getByLabelText('Open Task'))
        expect(screen.queryByRole('button', {name: 'Clear'})).not.toBeInTheDocument()
    })

    it('clears the date', () => {
        const onSetDueDate = vi.fn()
        renderCard({id: 'card-7', dueDate: '2026-08-05T00:00:00.000Z'}, onSetDueDate)
        fireEvent.click(screen.getByLabelText('Open Task'))

        fireEvent.click(screen.getByRole('button', {name: 'Clear'}))

        expect(onSetDueDate).toHaveBeenCalledWith('card-7', '')
    })
})
