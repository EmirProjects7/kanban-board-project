import type {Column} from './hooks/useBoard'

const BASE_URL = 'http://localhost:3000'

export function getToken(): string | null {
    return localStorage.getItem('token')
}

export function setToken(token: string): void {
    localStorage.setItem('token', token)
}

export function clearToken(): void {
    localStorage.removeItem('token')
}

export async function fetchColumns(): Promise<Column[]> {
    const res = await fetch(`${BASE_URL}/api/columns`, {
        headers: authHeaders()
    })
    return res.json()
}

export async function createCard(columnId: string, title: string) {
    const res = await fetch(`${BASE_URL}/api/columns/${columnId}/cards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function deleteCard(cardId: string) {
    await fetch(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    })
}

export async function updateCard(cardId: string, title: string) {
    await fetch(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({title}),
    })
}

export async function createColumn(title: string): Promise<Column> {
    const res = await fetch(`${BASE_URL}/api/columns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function deleteColumn(columnId: string) {
    await fetch(`${BASE_URL}/api/columns/${columnId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    })
}

export async function saveBoard(columns: Column[]) {
    await fetch(`${BASE_URL}/api/columns`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(columns),
    })
}

export async function register(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
    })
    if (!response.ok) {
        throw new Error('Registration failed')
    }
    return response.json()
}

export async function login(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
    })
    if (!response.ok) {
        throw new Error('Login failed')
    }
    return response.json()
}

function authHeaders(): Record<string, string> {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
    }
}