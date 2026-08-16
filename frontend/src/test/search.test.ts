import {describe, it, expect} from 'vitest'
import {cardMatches, isBlankQuery} from '../search'
import type {Card} from '../types'

function card(fields: Partial<Card> = {}): Card {
    return {id: 'card-1', title: 'Write the release notes', ...fields}
}

describe('isBlankQuery', () => {
    it('treats an empty string as blank', () => {
        expect(isBlankQuery('')).toBe(true)
    })

    it('treats whitespace as blank', () => {
        expect(isBlankQuery('   ')).toBe(true)
    })

    it('does not treat a real word as blank', () => {
        expect(isBlankQuery(' notes ')).toBe(false)
    })
})

describe('cardMatches', () => {
    it('matches part of the title', () => {
        expect(cardMatches(card(), 'release')).toBe(true)
    })

    it('ignores case', () => {
        expect(cardMatches(card(), 'RELEASE')).toBe(true)
    })

    it('ignores surrounding spaces', () => {
        expect(cardMatches(card(), '  release  ')).toBe(true)
    })

    it('says no when nothing contains the word', () => {
        expect(cardMatches(card(), 'invoice')).toBe(false)
    })

    // The word someone remembers is often in the detail rather than the title.
    it('matches the description too', () => {
        const withNote = card({title: 'Ticket 41', description: 'Chase the invoice'})
        expect(cardMatches(withNote, 'invoice')).toBe(true)
    })

    it('copes with a card that has no description', () => {
        expect(cardMatches(card({description: null}), 'release')).toBe(true)
        expect(cardMatches(card({description: null}), 'invoice')).toBe(false)
    })

    it('hides nothing when the query is blank', () => {
        expect(cardMatches(card(), '')).toBe(true)
        expect(cardMatches(card(), '   ')).toBe(true)
    })

    // Folding, not locale rules: the result has to be the same on a Turkish
    // machine and on an English CI runner, or the suite passes in one place and
    // fails in the other.
    it('folds the dotted and dotless i onto i', () => {
        expect(cardMatches(card({title: 'İzmir toplantısı'}), 'izmir')).toBe(true)
        expect(cardMatches(card({title: 'Işık ayarı'}), 'isik')).toBe(true)
    })

    it('finds accented words typed without their accents', () => {
        expect(cardMatches(card({title: 'Görüşme notları'}), 'gorusme')).toBe(true)
        expect(cardMatches(card({title: 'Café renovation'}), 'cafe')).toBe(true)
    })

    it('still matches when the accents are typed', () => {
        expect(cardMatches(card({title: 'Görüşme notları'}), 'görüşme')).toBe(true)
    })
})
