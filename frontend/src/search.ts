import type {Card} from './types'

// Deliberately not toLocaleLowerCase: that reads the runtime's locale, so the
// same search would behave one way on a Turkish machine and another on an
// English CI runner. Everything here folds the same way everywhere.
function normalise(value: string): string {
    return (
        value
            .trim()
            // The dotless and the dotted i are separate letters in Turkish and
            // neither survives a plain lowercase intact. Both fold onto "i".
            .replace(/[ıİ]/g, 'i')
            .toLowerCase()
            // Drops the marks on ç, ğ, ö, ş, ü and their neighbours, so
            // "gorusme" finds "görüşme" without anyone switching keyboards.
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
    )
}

/** True when the query is blank, since a blank search hides nothing. */
export function isBlankQuery(query: string): boolean {
    return normalise(query) === ''
}

// Title and description both, because a card's detail is often where the word
// someone remembers actually is.
export function cardMatches(card: Card, query: string): boolean {
    const needle = normalise(query)
    if (needle === '') return true

    const haystack = [card.title, card.description ?? '']
    return haystack.some((field) => normalise(field).includes(needle))
}
