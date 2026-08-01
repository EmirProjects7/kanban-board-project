import {describe, it, expect} from 'vitest'
import {titleSchema} from '../validation'

describe('titleSchema', () => {
    it('accepts a normal title', () => {
        const result = titleSchema.safeParse({title: 'Buy groceries'})
        expect(result.success).toBe(true)
    })

    it('trims surrounding whitespace', () => {
        const result = titleSchema.safeParse({title: '  Buy groceries  '})
        expect(result.success).toBe(true)
        expect(result.data?.title).toBe('Buy groceries')
    })

    it('rejects an empty title', () => {
        const result = titleSchema.safeParse({title: ''})
        expect(result.success).toBe(false)
    })

    it('rejects a whitespace-only title', () => {
        const result = titleSchema.safeParse({title: '   '})
        expect(result.success).toBe(false)
    })

    it('rejects a title longer than 255 characters', () => {
        const result = titleSchema.safeParse({title: 'a'.repeat(256)})
        expect(result.success).toBe(false)
    })

    it('accepts a title exactly 255 characters long', () => {
        const result = titleSchema.safeParse({title: 'a'.repeat(255)})
        expect(result.success).toBe(true)
    })

    it('rejects a missing title field', () => {
        const result = titleSchema.safeParse({})
        expect(result.success).toBe(false)
    })

    it('rejects a non-string title', () => {
        const result = titleSchema.safeParse({title: 42})
        expect(result.success).toBe(false)
    })
})
