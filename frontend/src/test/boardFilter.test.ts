import {describe, it, expect} from 'vitest'
import {countCards, isEmptyFilter, visibleColumns} from '../boardFilter'
import type {Column} from '../types'

const bug = {id: 'label-1', name: 'Bug', colour: 'red' as const}

const board: Column[] = [
    {
        id: 'col-1',
        title: 'Todo',
        cards: [
            {id: 'card-1', title: 'Chase the invoice'},
            {id: 'card-2', title: 'Book the room', labels: [{label: bug}]},
        ],
    },
    {
        id: 'col-2',
        title: 'Doing',
        cards: [{id: 'card-3', title: 'Ticket 41', description: 'The invoice is wrong'}],
    },
]

const nothing = {labelIds: new Set<string>(), query: '', overdueOnly: false}

describe('isEmptyFilter', () => {
    it('is empty with no labels and no query', () => {
        expect(isEmptyFilter(nothing)).toBe(true)
    })

    it('is not empty once a label is picked', () => {
        expect(isEmptyFilter({...nothing, labelIds: new Set(['label-1'])})).toBe(false)
    })

    it('is not empty once something is typed', () => {
        expect(isEmptyFilter({...nothing, query: 'invoice'})).toBe(false)
    })

    it('treats a query of spaces as empty', () => {
        expect(isEmptyFilter({...nothing, query: '   '})).toBe(true)
    })

    it('is not empty once overdue is on', () => {
        expect(isEmptyFilter({...nothing, overdueOnly: true})).toBe(false)
    })
})

describe('visibleColumns', () => {
    // Returning the same array lets the memo above it skip a render.
    it('hands back the original columns when nothing is filtering', () => {
        expect(visibleColumns(board, nothing)).toBe(board)
    })

    it('keeps only the cards carrying a picked label', () => {
        const result = visibleColumns(board, {...nothing, labelIds: new Set(['label-1'])})

        expect(result[0].cards.map((card) => card.id)).toEqual(['card-2'])
        expect(result[1].cards).toEqual([])
    })

    it('keeps only the cards matching the query', () => {
        const result = visibleColumns(board, {...nothing, query: 'invoice'})

        expect(result[0].cards.map((card) => card.id)).toEqual(['card-1'])
        expect(result[1].cards.map((card) => card.id)).toEqual(['card-3'])
    })

    // Neither rule wins: both have to be satisfied.
    it('narrows by label and query together', () => {
        const result = visibleColumns(board, {...nothing, labelIds: new Set(['label-1']), query: 'invoice'})

        expect(countCards(result)).toBe(0)
    })

    // Emptying a column is not the same as removing it, or the board would
    // rearrange itself under the pointer while someone types.
    it('keeps every column even when all its cards are hidden', () => {
        const result = visibleColumns(board, {...nothing, query: 'nothing matches this'})

        expect(result).toHaveLength(2)
        expect(result.map((column) => column.title)).toEqual(['Todo', 'Doing'])
    })

    it('leaves the columns it was given untouched', () => {
        visibleColumns(board, {...nothing, query: 'invoice'})

        expect(board[0].cards).toHaveLength(2)
    })
})

describe('overdue only', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString()

    const dated: Column[] = [
        {
            id: 'col-1',
            title: 'Todo',
            cards: [
                {id: 'late', title: 'Chase the invoice', dueDate: yesterday},
                {id: 'soon', title: 'Book the room', dueDate: tomorrow},
                {id: 'undated', title: 'Ticket 41'},
            ],
        },
    ]

    it('keeps only the cards whose day has passed', () => {
        const result = visibleColumns(dated, {...nothing, overdueOnly: true})

        expect(result[0].cards.map((card) => card.id)).toEqual(['late'])
    })

    // Undated is not late, it is undated, and lumping the two together would
    // bury a real list of overdue work under everything nobody dated.
    it('does not treat an undated card as late', () => {
        const result = visibleColumns(dated, {...nothing, overdueOnly: true})

        expect(result[0].cards.map((card) => card.id)).not.toContain('undated')
    })

    it('changes nothing while it is off', () => {
        expect(visibleColumns(dated, nothing)).toBe(dated)
    })

    it('narrows alongside the search rather than replacing it', () => {
        const result = visibleColumns(dated, {
            ...nothing,
            overdueOnly: true,
            query: 'room',
        })

        expect(countCards(result)).toBe(0)
    })
})

describe('countCards', () => {
    it('adds up across columns', () => {
        expect(countCards(board)).toBe(3)
    })

    it('counts an empty board as none', () => {
        expect(countCards([])).toBe(0)
    })
})
