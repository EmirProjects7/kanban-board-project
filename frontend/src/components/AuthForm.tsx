import { useState } from 'react'
import { login, register, setToken } from '../api'

type AuthFormProps = {
    onAuthSuccess: () => void
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function handleSubmit(event: React.FormEvent) {
        // A real form means Enter submits from either field, and password
        // managers recognise it. preventDefault stops the page reloading.
        event.preventDefault()
        setError('')

        // Caught here rather than sent on, so an incomplete form does not
        // spend one of the ten auth attempts the server allows per window.
        if (!email.trim() || !password) {
            setError('Enter your email and password.')
            return
        }

        try {
            if (isLogin) {
                const data = await login(email, password)
                setToken(data.token)
            } else {
                await register(email, password)
                const data = await login(email, password)
                setToken(data.token)
            }
            onAuthSuccess()
        } catch (err) {
            const fallback = isLogin ? 'Login failed' : 'Registration failed'
            setError(err instanceof Error && err.message ? err.message : fallback)
        }
    }

    return (
        // noValidate: the browser's own validation blocks the submit and just
        // moves focus, so the form would fail silently. Every message the user
        // sees comes from the block below instead.
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <h2>{isLogin ? 'Login' : 'Register'}</h2>

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit">
                {isLogin ? 'Login' : 'Register'}
            </button>

            <p>
                {isLogin ? "No account?" : 'Have an account?'}{' '}
                <button
                    type="button"
                    className="link-button"
                    onClick={() => setIsLogin(!isLogin)}
                >
                    {isLogin ? 'Register' : 'Login'}
                </button>
            </p>
        </form>
    )
}