import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {DndContext} from '@dnd-kit/core'
import Card from '../components/Card'
import Column from '../components/Column'
import * as api from '../api'

const SCRIPT_PAYLOAD = '<script>window.pwned = true</script>'
const IMG_PAYLOAD = '<img src=x onerror="window.pwned = true">'

beforeEach(() => {
    localStorage.clear()
    delete (window as unknown as {pwned?: boolean}).pwned
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('stored XSS in card titles', () => {
    function renderCard(title: string) {
        render(
            <DndContext>
                <Card
                    card={{id: 'card-1', title}}
                    onDelete={() => {}}
                    onEdit={() => {}}
                    onDescribe={() => {}}
                    onSetDueDate={() => {}}
                    labels={[]}
                    onToggleLabel={() => {}}
                    onCreateLabel={() => {}}
                />
            </DndContext>
        )
    }

    it('renders a script payload as visible text, not as markup', () => {
        renderCard(SCRIPT_PAYLOAD)
        expect(screen.getByText(SCRIPT_PAYLOAD)).toBeInTheDocument()
        expect(document.querySelector('script')).toBeNull()
    })

    it('renders an image payload without creating an img element', () => {
        renderCard(IMG_PAYLOAD)
        expect(screen.getByText(IMG_PAYLOAD)).toBeInTheDocument()
        expect(document.querySelector('img')).toBeNull()
    })

    it('does not execute the payload', () => {
        renderCard(IMG_PAYLOAD)
        expect((window as unknown as {pwned?: boolean}).pwned).toBeUndefined()
    })

    it('keeps the payload as literal text when editing', () => {
        renderCard(SCRIPT_PAYLOAD)
        fireEvent.doubleClick(screen.getByText(SCRIPT_PAYLOAD))
        expect(screen.getByDisplayValue(SCRIPT_PAYLOAD)).toBeInTheDocument()
    })
})

describe('stored XSS in column titles', () => {
    it('renders a script payload as visible text, not as markup', () => {
        render(
            <DndContext>
                <Column
                    column={{id: 'col-1', title: SCRIPT_PAYLOAD, cards: []}}
                    onAddCard={() => {}}
                    onDeleteCard={() => {}}
                    onEditCard={() => {}}
                    onDescribeCard={() => {}}
                    onSetCardDueDate={() => {}}
                    labels={[]}
                    onToggleCardLabel={() => {}}
                    onCreateLabel={() => {}}
                    onEditColumn={() => {}}
                    onDeleteColumn={() => {}}
                />
            </DndContext>
        )

        expect(screen.getByRole('heading', {name: SCRIPT_PAYLOAD})).toBeInTheDocument()
        expect(document.querySelector('script')).toBeNull()
    })
})

describe('token handling', () => {
    it('sends the token in the Authorization header, never in the URL', async () => {
        api.setToken('secret-jwt')
        const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => []})
        vi.stubGlobal('fetch', fetchMock)

        await api.fetchColumns('board-1')

        const [url, options] = fetchMock.mock.calls[0]
        expect(url).not.toContain('secret-jwt')
        expect(options.headers.Authorization).toBe('Bearer secret-jwt')
    })

    it('removes the token on logout so it cannot be reused', () => {
        api.setToken('secret-jwt')
        api.clearToken()
        expect(api.getToken()).toBeNull()
        expect(localStorage.getItem('token')).toBeNull()
    })
})
