import type {Board, Card, Column, Label, LabelColour} from './types'

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

// Sessions last a week. Once the token expires every board request comes back
// 401, so the app needs to hear about it and send the user back to the login
// screen instead of leaving them on a board that silently refuses to save.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
    onUnauthorized = handler
}

// One place to end a session, so a rejected request and a rejected socket
// handshake behave the same.
export function handleUnauthorized(): void {
    clearToken()
    onUnauthorized?.()
}

// Every board request goes through here so a failure (401, 403, 500, ...)
// throws instead of silently returning an error body as if it were the payload.
async function request(url: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {...options, headers: authHeaders()})
    if (res.status === 401) {
        handleUnauthorized()
    }
    if (!res.ok) {
        throw new Error(`Request to ${url} failed with status ${res.status}`)
    }
    return res
}

export async function fetchBoards(): Promise<Board[]> {
    const res = await request(`${BASE_URL}/api/boards`)
    return res.json()
}

export async function createBoard(title: string): Promise<Board> {
    const res = await request(`${BASE_URL}/api/boards`, {
        method: 'POST',
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function saveBoardOrder(boards: Board[]): Promise<void> {
    await request(`${BASE_URL}/api/boards/order`, {
        method: 'PUT',
        body: JSON.stringify(boards.map((board) => ({id: board.id}))),
    })
}

export async function updateBoard(boardId: string, title: string): Promise<void> {
    await request(`${BASE_URL}/api/boards/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify({title}),
    })
}

export async function deleteBoard(boardId: string): Promise<void> {
    await request(`${BASE_URL}/api/boards/${boardId}`, {
        method: 'DELETE',
    })
}

export async function fetchLabels(boardId: string): Promise<Label[]> {
    const res = await request(`${BASE_URL}/api/boards/${boardId}/labels`)
    return res.json()
}

export async function createLabel(
    boardId: string,
    name: string,
    colour: LabelColour
): Promise<Label> {
    const res = await request(`${BASE_URL}/api/boards/${boardId}/labels`, {
        method: 'POST',
        body: JSON.stringify({name, colour}),
    })
    return res.json()
}

export async function updateLabel(
    labelId: string,
    name: string,
    colour: LabelColour
): Promise<void> {
    await request(`${BASE_URL}/api/labels/${labelId}`, {
        method: 'PUT',
        body: JSON.stringify({name, colour}),
    })
}

export async function deleteLabel(labelId: string): Promise<void> {
    await request(`${BASE_URL}/api/labels/${labelId}`, {method: 'DELETE'})
}

export async function attachLabel(cardId: string, labelId: string): Promise<void> {
    await request(`${BASE_URL}/api/cards/${cardId}/labels/${labelId}`, {method: 'PUT'})
}

export async function detachLabel(cardId: string, labelId: string): Promise<void> {
    await request(`${BASE_URL}/api/cards/${cardId}/labels/${labelId}`, {method: 'DELETE'})
}

export async function fetchColumns(boardId: string): Promise<Column[]> {
    const res = await request(`${BASE_URL}/api/boards/${boardId}/columns`)
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

// Only the given fields are sent, so renaming a card leaves its description
// untouched and vice versa.
export async function updateCard(
    cardId: string,
    changes: {title?: string; description?: string | null; dueDate?: string | null}
): Promise<void> {
    await request(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
    })
}

export async function createColumn(boardId: string, title: string): Promise<Column> {
    const res = await request(`${BASE_URL}/api/boards/${boardId}/columns`, {
        method: 'POST',
        body: JSON.stringify({title}),
    })
    return res.json()
}

export async function updateColumn(columnId: string, title: string): Promise<void> {
    await request(`${BASE_URL}/api/columns/${columnId}`, {
        method: 'PUT',
        body: JSON.stringify({title}),
    })
}

export async function deleteColumn(columnId: string): Promise<void> {
    await request(`${BASE_URL}/api/columns/${columnId}`, {
        method: 'DELETE',
    })
}

export async function saveBoard(boardId: string, columns: Column[]): Promise<void> {
    await request(`${BASE_URL}/api/boards/${boardId}/columns`, {
        method: 'PUT',
        body: JSON.stringify(columns),
    })
}

// The auth endpoints answer with {error} on failure. Passing that message on
// lets the form say "Too many attempts" instead of a generic failure.
async function readError(response: Response, fallback: string): Promise<string> {
    try {
        const body = await response.json()
        return typeof body?.error === 'string' ? body.error : fallback
    } catch {
        return fallback
    }
}

export async function register(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
    })
    if (!response.ok) {
        throw new Error(await readError(response, 'Registration failed'))
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
        throw new Error(await readError(response, 'Login failed'))
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