import type { Column } from './hooks/useBoard'

const BASE_URL = 'http://localhost:3000'

export async function fetchColumns(): Promise<Column[]> {
    const res = await fetch(`${BASE_URL}/api/columns`)
    return res.json()
}

export async function createCard(columnId: string, title: string) {
    const res = await fetch(`${BASE_URL}/api/columns/${columnId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    })
    return res.json()
}

export async function deleteCard(cardId: string) {
    await fetch(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'DELETE',
    })
}

export async function updateCard(cardId: string, title: string) {
    await fetch(`${BASE_URL}/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    })
}

export async function createColumn(title: string): Promise<Column> {
    const res = await fetch(`${BASE_URL}/api/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    })
    return res.json()
}

export async function deleteColumn(columnId: string) {
    await fetch(`${BASE_URL}/api/columns/${columnId}`, {
        method: 'DELETE',
    })
}

export async function saveBoard(columns: Column[]) {
    await fetch(`${BASE_URL}/api/columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(columns),
    })
}