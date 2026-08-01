import {useState, useEffect, useRef} from 'react'
import * as api from '../api'
import {connectSocket} from '../socket'
import type {Card, Column} from '../types'

export function useBoard(isAuthenticated: boolean) {
    const [columns, setColumns] = useState<Column[]>([])
    const isDraggingRef = useRef(false)

    useEffect(() => {
        if (!isAuthenticated) {
            return
        }
        api.fetchColumns()
            .then((data) => setColumns(data))
            .catch((error) => console.error('Fetch error:', error))
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
        const newCard: Card = await api.createCard(columnId, title)
        setColumns((prev) =>
            prev.map((column) =>
                column.id === columnId ? {...column, cards: [...column.cards, newCard]} : column
            )
        )
    }

    async function deleteCard(cardId: string) {
        await api.deleteCard(cardId)
        setColumns((prev) => prev.map((column) => ({
            ...column, cards: column.cards.filter((c) => c.id !== cardId)
        })))
    }

    async function editCard(cardId: string, newTitle: string) {
        await api.updateCard(cardId, newTitle)
        setColumns((prev) => prev.map((column) =>
            ({...column, cards: column.cards.map((c) => c.id === cardId ? {...c, title: newTitle} : c)})))
    }

    async function addColumn(title: string) {
        const newColumn: Column = await api.createColumn(title)
        setColumns((prev) => [...prev, newColumn])
    }

    async function deleteColumn(columnId: string) {
        await api.deleteColumn(columnId)
        setColumns((prev) => prev.filter((column) => column.id !== columnId))
    }

    async function saveBoard(updatedColumns: Column[]) {
        await api.saveBoard(updatedColumns)
    }

    return {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
        addColumn,
        deleteColumn,
        saveBoard,
        isDraggingRef
    }

}