import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import App from '../App'

const {apiMock, socketMock, disconnectSocket} = vi.hoisted(() => ({
    apiMock: {
        getToken: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        setUnauthorizedHandler: vi.fn(),
        fetchBoards: vi.fn(),
        createBoard: vi.fn(),
        updateBoard: vi.fn(),
        deleteBoard: vi.fn(),
        fetchColumns: vi.fn(),
        fetchLabels: vi.fn(),
        createLabel: vi.fn(),
        updateLabel: vi.fn(),
        deleteLabel: vi.fn(),
        attachLabel: vi.fn(),
        detachLabel: vi.fn(),
        createCard: vi.fn(),
        deleteCard: vi.fn(),
        updateCard: vi.fn(),
        createColumn: vi.fn(),
        updateColumn: vi.fn(),
        deleteColumn: vi.fn(),
        saveBoard: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
    },
    socketMock: {on: vi.fn(), off: vi.fn()},
    disconnectSocket: vi.fn(),
}))

vi.mock('../api', () => apiMock)
vi.mock('../socket', () => ({connectSocket: () => socketMock, disconnectSocket}))

const boards = [{id: 'board-1', title: 'My Board', order: 0}]
const board = [{id: 'col-1', title: 'Todo', cards: [{id: 'card-1', title: 'Task'}]}]

beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    apiMock.fetchBoards.mockResolvedValue(boards)
    apiMock.fetchColumns.mockResolvedValue(board)
    apiMock.fetchLabels.mockResolvedValue([])
    apiMock.logout.mockResolvedValue(undefined)
})

describe('authentication gate', () => {
    it('shows the login form when there is no token', () => {
        apiMock.getToken.mockReturnValue(null)
        render(<App />)
        expect(screen.getByRole('heading', {name: 'Login'})).toBeInTheDocument()
    })

    it('does not load a board when there is no token', () => {
        apiMock.getToken.mockReturnValue(null)
        render(<App />)
        expect(apiMock.fetchColumns).not.toHaveBeenCalled()
    })

    it('shows the board when a token is already stored', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        expect(await screen.findByRole('heading', {name: 'Todo'})).toBeInTheDocument()
    })

    it('moves to the board after a successful login', async () => {
        apiMock.getToken.mockReturnValue(null)
        apiMock.login.mockResolvedValue({token: 'fresh-token'})
        render(<App />)

        fireEvent.change(screen.getByPlaceholderText('Email'), {
            target: {value: 'a@b.com'},
        })
        fireEvent.change(screen.getByPlaceholderText('Password'), {
            target: {value: 'secret123'},
        })
        fireEvent.click(screen.getByRole('button', {name: 'Login'}))

        expect(await screen.findByRole('heading', {name: 'Todo'})).toBeInTheDocument()
    })
})

describe('logout', () => {
    it('clears the token, drops the socket and returns to the login form', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        fireEvent.click(screen.getByRole('button', {name: 'Logout'}))

        // The server call goes first, so the local teardown lands a tick later.
        expect(await screen.findByRole('heading', {name: 'Login'})).toBeInTheDocument()
        expect(apiMock.logout).toHaveBeenCalledOnce()
        expect(apiMock.clearToken).toHaveBeenCalledOnce()
        expect(disconnectSocket).toHaveBeenCalledOnce()
    })
})

describe('expired session', () => {
    it('registers a handler with the api client', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        expect(apiMock.setUnauthorizedHandler).toHaveBeenCalled()
    })

    it('returns to the login form when that handler fires', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        const handler = apiMock.setUnauthorizedHandler.mock.calls
            .map((call) => call[0])
            .filter(Boolean)
            .at(-1)
        handler()

        await waitFor(() =>
            expect(screen.getByRole('heading', {name: 'Login'})).toBeInTheDocument()
        )
        expect(disconnectSocket).toHaveBeenCalled()
    })
})

describe('theme', () => {
    it('starts dark by default', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('honours a stored preference', async () => {
        localStorage.setItem('theme', 'light')
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('switches and remembers the choice', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        fireEvent.click(screen.getByRole('button', {name: 'Light Mode'}))

        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
        expect(localStorage.getItem('theme')).toBe('light')
    })
})

describe('board errors', () => {
    it('shows nothing while everything works', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows a banner when the board fails to load', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        apiMock.fetchColumns.mockRejectedValue(new Error('boom'))
        render(<App />)

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not load the board.'
        )
    })

    it('can dismiss the banner', async () => {
        apiMock.getToken.mockReturnValue('a-token')
        apiMock.fetchColumns.mockRejectedValue(new Error('boom'))
        render(<App />)
        await screen.findByRole('alert')

        fireEvent.click(screen.getByLabelText('Dismiss error'))

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})

describe('searching the board', () => {
    const bug = {id: 'label-1', name: 'Bug', colour: 'red' as const}

    const busyBoard = [
        {
            id: 'col-1',
            title: 'Todo',
            cards: [
                {id: 'card-1', title: 'Chase the invoice'},
                {id: 'card-2', title: 'Görüşme notları'},
            ],
        },
        {
            id: 'col-2',
            title: 'Doing',
            cards: [
                {
                    id: 'card-3',
                    title: 'Ticket 41',
                    description: 'The invoice is wrong',
                    labels: [{label: bug}],
                },
            ],
        },
    ]

    async function renderBoard() {
        apiMock.getToken.mockReturnValue('a-token')
        apiMock.fetchColumns.mockResolvedValue(busyBoard)
        apiMock.fetchLabels.mockResolvedValue([bug])
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})
        return screen.getByLabelText('Search cards')
    }

    it('shows every card before anything is typed', async () => {
        await renderBoard()

        expect(screen.getByText('Chase the invoice')).toBeInTheDocument()
        expect(screen.getByText('Görüşme notları')).toBeInTheDocument()
        expect(screen.getByText('Ticket 41')).toBeInTheDocument()
    })

    it('keeps the cards that match and hides the rest', async () => {
        const input = await renderBoard()

        fireEvent.change(input, {target: {value: 'invoice'}})

        expect(screen.getByText('Chase the invoice')).toBeInTheDocument()
        expect(screen.queryByText('Görüşme notları')).not.toBeInTheDocument()
    })

    // The word is in the detail rather than the title on this one.
    it('reaches a card through its description', async () => {
        const input = await renderBoard()

        fireEvent.change(input, {target: {value: 'invoice'}})

        expect(screen.getByText('Ticket 41')).toBeInTheDocument()
    })

    it('finds an accented title typed without the accents', async () => {
        const input = await renderBoard()

        fireEvent.change(input, {target: {value: 'gorusme'}})

        expect(screen.getByText('Görüşme notları')).toBeInTheDocument()
        expect(screen.queryByText('Chase the invoice')).not.toBeInTheDocument()
    })

    it('leaves the columns in place when nothing matches', async () => {
        const input = await renderBoard()

        fireEvent.change(input, {target: {value: 'nothing here'}})

        expect(screen.queryByText('Chase the invoice')).not.toBeInTheDocument()
        expect(screen.getByRole('heading', {name: 'Todo'})).toBeInTheDocument()
        expect(screen.getByRole('heading', {name: 'Doing'})).toBeInTheDocument()
    })

    it('puts the hidden cards back when the search is cleared', async () => {
        const input = await renderBoard()
        fireEvent.change(input, {target: {value: 'invoice'}})

        fireEvent.click(screen.getByRole('button', {name: 'Clear'}))

        expect(screen.getByText('Görüşme notları')).toBeInTheDocument()
    })

    // Neither filter wins: a label and a word together leave the cards that
    // answer to both.
    it('narrows alongside the label filter rather than replacing it', async () => {
        const input = await renderBoard()

        fireEvent.click(screen.getByRole('button', {name: 'Bug'}))
        expect(screen.getByText('Ticket 41')).toBeInTheDocument()
        expect(screen.queryByText('Chase the invoice')).not.toBeInTheDocument()

        fireEvent.change(input, {target: {value: 'gorusme'}})

        expect(screen.queryByText('Ticket 41')).not.toBeInTheDocument()
        expect(screen.queryByText('Görüşme notları')).not.toBeInTheDocument()
    })
})

describe('the slash shortcut', () => {
    async function renderBoard() {
        apiMock.getToken.mockReturnValue('a-token')
        render(<App />)
        await screen.findByRole('heading', {name: 'Todo'})
        return screen.getByLabelText('Search cards')
    }

    it('puts the caret in the search box', async () => {
        const input = await renderBoard()

        fireEvent.keyDown(document.body, {key: '/'})

        expect(input).toHaveFocus()
    })

    // Otherwise typing "and/or" into a card title would jump the caret away
    // mid-word.
    it('leaves the key alone while another field has the caret', async () => {
        await renderBoard()
        const newCard = screen.getAllByPlaceholderText('New card...')[0]
        newCard.focus()

        fireEvent.keyDown(newCard, {key: '/'})

        expect(newCard).toHaveFocus()
    })

    // A slash with a modifier belongs to the browser or the operating system.
    it('ignores the key when it carries a modifier', async () => {
        const input = await renderBoard()

        fireEvent.keyDown(document.body, {key: '/', metaKey: true})

        expect(input).not.toHaveFocus()
    })
})
