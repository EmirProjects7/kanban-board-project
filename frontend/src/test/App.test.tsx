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
        createCard: vi.fn(),
        deleteCard: vi.fn(),
        updateCard: vi.fn(),
        createColumn: vi.fn(),
        updateColumn: vi.fn(),
        deleteColumn: vi.fn(),
        saveBoard: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
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

        expect(apiMock.clearToken).toHaveBeenCalledOnce()
        expect(disconnectSocket).toHaveBeenCalledOnce()
        expect(screen.getByRole('heading', {name: 'Login'})).toBeInTheDocument()
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
