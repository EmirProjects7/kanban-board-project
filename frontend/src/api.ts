import type {Card, Column} from './types'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function getToken(): string | null {
    return localStorage.getItem('token')
}

export function setToken(token: string): void {
    localStorage.setItem('token', token)
}

export function clearToken(): void {
    localStorage.removeItem('token')
}

// Every mutating request goes through here so a failed request (403, 500, etc.)
// throws instead of silently returning an error body as if it were the payload.
async function request(url: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {...options, headers: authHeaders()})
    if (!res.ok) {
        throw new Error(`Request to ${url} failed with status ${res.status}`)
    }
    return res
}

export async function fetchColumns(): Promise<Column[]> {
    const res = await request(`${BASE_URL}/api/columns`)
    return res.json()
}

export async function createCard(columnId: string, title: string): Promise<Card> {
    const res = await request(`${BASE_URL}/api/columns/${columnId}/cards`, {
        method: 'POST',
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function deleteCard(cardId: string): Promise<void> {
    await request(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'DELETE',
    })
}

export async function updateCard(cardId: string, title: string): Promise<void> {
    await request(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({title}),
    })
}

export async function createColumn(title: string): Promise<Column> {
    const res = await request(`${BASE_URL}/api/columns`, {
        method: 'POST',
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function deleteColumn(columnId: string): Promise<void> {
    await request(`${BASE_URL}/api/columns/${columnId}`, {
        method: 'DELETE',
    })
}

export async function saveBoard(columns: Column[]): Promise<void> {
    await request(`${BASE_URL}/api/columns`, {
        method: 'PUT',
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