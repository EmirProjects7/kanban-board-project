import {useState, useEffect, useRef} from 'react'
import * as api from '../api'
import {connectSocket} from '../socket'
import type {Card, Column} from '../types'

export function useBoard(isAuthenticated: boolean) {
    const [columns, setColumns] = useState<Column[]>([])
    const [error, setError] = useState<string | null>(null)
    const isDraggingRef = useRef(false)

    // Every board action is fired from an event handler, so without this a
    // rejected request would only ever surface as an unhandled promise and the
    // user would see nothing at all.
    async function attempt(message: string, action: () => Promise<void>) {
        try {
            await action()
            setError(null)
        } catch (err) {
            console.error(err)
            setError(message)
        }
    }

    function dismissError() {
        setError(null)
    }

    useEffect(() => {
        if (!isAuthenticated) {
            return
        }
        api.fetchColumns()
            .then((data) => setColumns(data))
            .catch((err) => {
                console.error(err)
                setError('Could not load the board.')
            })
    }, [isAuthenticated])

    useEffect(() => {
        if (!isAuthenticated) {
            return
        }
        const socket = connectSocket()
        socket.on('board:updated', (data: Column[]) => {
            if (isDraggingRef.current) return
            setColumns(data)
        })
        return () => {
            socket.off('board:updated')
        }
    }, [isAuthenticated])

    async function addCard(columnId: string, title: string) {
        await attempt('Could not add the card.', async () => {
            const newCard: Card = await api.createCard(columnId, title)
            setColumns((prev) =>
                prev.map((column) =>
                    column.id === columnId ? {...column, cards: [...column.cards, newCard]} : column
                )
            )
        })
    }

    async function deleteCard(cardId: string) {
        await attempt('Could not delete the card.', async () => {
            await api.deleteCard(cardId)
            setColumns((prev) => prev.map((column) => ({
                ...column, cards: column.cards.filter((c) => c.id !== cardId)
            })))
        })
    }

    async function editCard(cardId: string, newTitle: string) {
        await attempt('Could not rename the card.', async () => {
            await api.updateCard(cardId, newTitle)
            setColumns((prev) => prev.map((column) =>
                ({...column, cards: column.cards.map((c) => c.id === cardId ? {...c, title: newTitle} : c)})))
        })
    }

    async function addColumn(title: string) {
        await attempt('Could not add the column.', async () => {
            const newColumn: Column = await api.createColumn(title)
            setColumns((prev) => [...prev, newColumn])
        })
    }

    async function editColumn(columnId: string, newTitle: string) {
        await attempt('Could not rename the column.', async () => {
            await api.updateColumn(columnId, newTitle)
            setColumns((prev) => prev.map((column) =>
                column.id === columnId ? {...column, title: newTitle} : column))
        })
    }

    async function deleteColumn(columnId: string) {
        await attempt('Could not delete the column.', async () => {
            await api.deleteColumn(columnId)
            setColumns((prev) => prev.filter((column) => column.id !== columnId))
        })
    }

    async function saveBoard(updatedColumns: Column[]) {
        await attempt('Could not save the new order.', async () => {
            await api.saveBoard(updatedColumns)
        })
    }

    return {
        columns,
        setColumns,
        error,
        dismissError,
        addCard,
        deleteCard,
        editCard,
        addColumn,
        editColumn,
        deleteColumn,
        saveBoard,
        isDraggingRef
    }

}
