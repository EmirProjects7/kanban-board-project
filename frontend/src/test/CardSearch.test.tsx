import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {CardSearch} from '../components/CardSearch'

function renderSearch(query = '', matchCount = 0) {
    const onChange = vi.fn()
    const view = render(
        <CardSearch query={query} onChange={onChange} matchCount={matchCount} />
    )
    return {...view, onChange, input: screen.getByLabelText('Search cards')}
}

describe('typing', () => {
    it('reports what was typed', () => {
        const {onChange, input} = renderSearch()

        fireEvent.change(input, {target: {value: 'invoice'}})

        expect(onChange).toHaveBeenCalledWith('invoice')
    })
})

describe('while there is nothing to search for', () => {
    it('offers no count and no clear button', () => {
        renderSearch()

        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', {name: 'Clear'})).not.toBeInTheDocument()
    })

    it('stays quiet for a query that is only spaces', () => {
        renderSearch('   ')

        expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
})

describe('while searching', () => {
    // Announced rather than only shown, so the board thinning out is not
    // silence for anyone who cannot see it.
    it('announces how many cards are left', () => {
        renderSearch('invoice', 3)

        expect(screen.getByRole('status')).toHaveTextContent('3 cards')
    })

    it('counts one card without the plural', () => {
        renderSearch('invoice', 1)

        expect(screen.getByRole('status')).toHaveTextContent('1 card')
    })

    it('says so when nothing matched', () => {
        renderSearch('invoice', 0)

        expect(screen.getByRole('status')).toHaveTextContent('No cards match')
    })
})

describe('getting back out', () => {
    it('clears from the button', () => {
        const {onChange} = renderSearch('invoice', 2)

        fireEvent.click(screen.getByRole('button', {name: 'Clear'}))

        expect(onChange).toHaveBeenCalledWith('')
    })

    // Escape leaves a search box everywhere else, so it should here.
    it('clears on Escape', () => {
        const {onChange, input} = renderSearch('invoice', 2)

        fireEvent.keyDown(input, {key: 'Escape'})

        expect(onChange).toHaveBeenCalledWith('')
    })
})
