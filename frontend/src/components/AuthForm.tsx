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

    async function handleSubmit() {
        setError('')
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
        } catch {
            setError(isLogin ? 'Login failed' : 'Registration failed')
        }
    }

    return (
        <div className="auth-form">
            <h2>{isLogin ? 'Login' : 'Register'}</h2>

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="auth-error">{error}</p>}

            <button onClick={handleSubmit}>
                {isLogin ? 'Login' : 'Register'}
            </button>

            <p>
                {isLogin ? "No account?" : 'Have an account?'}{' '}
                <button className="link-button" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Register' : 'Login'}
                </button>
            </p>
        </div>
    )
}