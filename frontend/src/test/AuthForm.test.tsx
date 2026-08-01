import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {AuthForm} from '../components/AuthForm'

const {apiMock} = vi.hoisted(() => ({
    apiMock: {
        login: vi.fn(),
        register: vi.fn(),
        setToken: vi.fn(),
    },
}))

vi.mock('../api', () => apiMock)

function fillCredentials(email = 'a@b.com', password = 'secret123') {
    fireEvent.change(screen.getByPlaceholderText('Email'), {target: {value: email}})
    fireEvent.change(screen.getByPlaceholderText('Password'), {target: {value: password}})
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('mode switching', () => {
    it('starts in login mode', () => {
        render(<AuthForm onAuthSuccess={() => {}} />)
        expect(screen.getByRole('heading', {name: 'Login'})).toBeInTheDocument()
    })

    it('switches to register mode', () => {
        render(<AuthForm onAuthSuccess={() => {}} />)
        fireEvent.click(screen.getByRole('button', {name: 'Register'}))
        expect(screen.getByRole('heading', {name: 'Register'})).toBeInTheDocument()
    })
})

describe('login', () => {
    it('stores the token and reports success', async () => {
        apiMock.login.mockResolvedValue({token: 'jwt-token'})
        const onAuthSuccess = vi.fn()
        render(<AuthForm onAuthSuccess={onAuthSuccess} />)

        fillCredentials()
        fireEvent.click(screen.getByRole('button', {name: 'Login'}))

        await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledOnce())
        expect(apiMock.setToken).toHaveBeenCalledWith('jwt-token')
    })

    it('shows an error and does not report success when login fails', async () => {
        apiMock.login.mockRejectedValue(new Error('Login failed'))
        const onAuthSuccess = vi.fn()
        render(<AuthForm onAuthSuccess={onAuthSuccess} />)

        fillCredentials('a@b.com', 'wrong')
        fireEvent.click(screen.getByRole('button', {name: 'Login'}))

        await waitFor(() => expect(screen.getByText('Login failed')).toBeInTheDocument())
        expect(onAuthSuccess).not.toHaveBeenCalled()
        expect(apiMock.setToken).not.toHaveBeenCalled()
    })

    it('masks the password field', () => {
        render(<AuthForm onAuthSuccess={() => {}} />)
        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
    })
})

describe('register', () => {
    it('logs the user in straight after registering', async () => {
        apiMock.register.mockResolvedValue({id: 'user-1'})
        apiMock.login.mockResolvedValue({token: 'jwt-token'})
        const onAuthSuccess = vi.fn()
        render(<AuthForm onAuthSuccess={onAuthSuccess} />)

        fireEvent.click(screen.getByRole('button', {name: 'Register'}))
        fillCredentials()
        fireEvent.click(screen.getByRole('button', {name: 'Register'}))

        await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledOnce())
        expect(apiMock.register).toHaveBeenCalledWith('a@b.com', 'secret123')
        expect(apiMock.login).toHaveBeenCalledWith('a@b.com', 'secret123')
    })

    it('shows a registration error when the email is taken', async () => {
        apiMock.register.mockRejectedValue(new Error('Registration failed'))
        render(<AuthForm onAuthSuccess={() => {}} />)

        fireEvent.click(screen.getByRole('button', {name: 'Register'}))
        fillCredentials()
        fireEvent.click(screen.getByRole('button', {name: 'Register'}))

        await waitFor(() => expect(screen.getByText('Registration failed')).toBeInTheDocument())
    })

    it('clears a previous error on the next attempt', async () => {
        apiMock.login.mockRejectedValueOnce(new Error('Login failed'))
        apiMock.login.mockResolvedValueOnce({token: 'jwt-token'})
        render(<AuthForm onAuthSuccess={() => {}} />)

        fillCredentials('a@b.com', 'wrong')
        fireEvent.click(screen.getByRole('button', {name: 'Login'}))
        await waitFor(() => expect(screen.getByText('Login failed')).toBeInTheDocument())

        fillCredentials()
        fireEvent.click(screen.getByRole('button', {name: 'Login'}))

        await waitFor(() => expect(screen.queryByText('Login failed')).not.toBeInTheDocument())
    })
})

describe('submitting with Enter', () => {
    // Enter inside a field submits the surrounding form, which is what the
    // browser does for real. fireEvent.submit is the jsdom equivalent.
    function pressEnterInPassword() {
        fireEvent.submit(screen.getByPlaceholderText('Password').closest('form')!)
    }

    it('logs in with Enter instead of the button', async () => {
        apiMock.login.mockResolvedValue({token: 'jwt-token'})
        const onAuthSuccess = vi.fn()
        render(<AuthForm onAuthSuccess={onAuthSuccess} />)

        fillCredentials()
        pressEnterInPassword()

        await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledOnce())
        expect(apiMock.login).toHaveBeenCalledWith('a@b.com', 'secret123')
    })

    it('registers with Enter instead of the button', async () => {
        apiMock.register.mockResolvedValue({id: 'user-1'})
        apiMock.login.mockResolvedValue({token: 'jwt-token'})
        const onAuthSuccess = vi.fn()
        render(<AuthForm onAuthSuccess={onAuthSuccess} />)

        fireEvent.click(screen.getByRole('button', {name: 'Register'}))
        fillCredentials()
        pressEnterInPassword()

        await waitFor(() => expect(onAuthSuccess).toHaveBeenCalledOnce())
        expect(apiMock.register).toHaveBeenCalledWith('a@b.com', 'secret123')
    })

    it('shows the error when an Enter submission fails', async () => {
        apiMock.login.mockRejectedValue(new Error('Invalid credentials'))
        render(<AuthForm onAuthSuccess={() => {}} />)

        fillCredentials('a@b.com', 'wrong')
        pressEnterInPassword()

        await waitFor(() =>
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
        )
    })

    it('submits the form rather than reloading the page', () => {
        apiMock.login.mockResolvedValue({token: 'jwt-token'})
        render(<AuthForm onAuthSuccess={() => {}} />)

        fillCredentials()
        const form = screen.getByPlaceholderText('Password').closest('form')!
        const submitEvent = new Event('submit', {bubbles: true, cancelable: true})
        form.dispatchEvent(submitEvent)

        expect(submitEvent.defaultPrevented).toBe(true)
    })

    it('does not submit when the mode toggle is pressed', () => {
        render(<AuthForm onAuthSuccess={() => {}} />)

        fillCredentials()
        fireEvent.click(screen.getByRole('button', {name: 'Register'}))

        expect(apiMock.login).not.toHaveBeenCalled()
        expect(apiMock.register).not.toHaveBeenCalled()
    })
})
