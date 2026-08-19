import {cardMatches, isBlankQuery} from './search'
import {isOverdue} from './dueDate'
import type {Column} from './types'

export type BoardFilter = {
    labelIds: Set<string>
    query: string
    overdueOnly: boolean
}

export function isEmptyFilter(filter: BoardFilter): boolean {
    return filter.labelIds.size === 0 && isBlankQuery(filter.query) && !filter.overdueOnly
}

function keeps(card: Column['cards'][number], filter: BoardFilter): boolean {
    const labelled =
        filter.labelIds.size === 0 ||
        (card.labels ?? []).some((entry) => filter.labelIds.has(entry.label.id))

    // A card with no date is not late, it is undated, so it goes with the rest
    // of what the filter is hiding.
    const late = !filter.overdueOnly || isOverdue(card.dueDate)

    return labelled && late && cardMatches(card, filter.query)
}

// Hides cards from view only. The columns themselves are always returned, and
// the caller keeps the unfiltered list for drag and drop, so a drop never
// reorders around cards that are out of sight.
//
// Every rule narrows together rather than any one winning: a label and a word
// leave the cards that answer to both.
export function visibleColumns(columns: Column[], filter: BoardFilter): Column[] {
    if (isEmptyFilter(filter)) return columns

    return columns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => keeps(card, filter)),
    }))
}

export function countCards(columns: Column[]): number {
    return columns.reduce((total, column) => total + column.cards.length, 0)
}
