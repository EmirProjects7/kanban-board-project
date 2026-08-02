import {useState, useEffect, useRef} from 'react'
import * as api from '../api'
import {connectSocket} from '../socket'
import type {Card, Column} from '../types'

export function useBoard(boardId: string | null) {
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
        if (!boardId) return
        api.fetchColumns(boardId)
            .then((data) => setColumns(data))
            .catch((err) => {
                console.error(err)
                setError('Could not load the board.')
            })
    }, [boardId])

    useEffect(() => {
        if (!boardId) {
            return
        }
        const socket = connectSocket()
        socket.on('board:updated', (update: {boardId: string; columns: Column[]}) => {
            if (isDraggingRef.current) return
            // The room is per user, so updates for a board that is not on
            // screen arrive here too and have to be ignored.
            if (update.boardId !== boardId) return
            setColumns(update.columns)
        })
        return () => {
            socket.off('board:updated')
        }
    }, [boardId])

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
            await api.updateCard(cardId, {title: newTitle})
            setColumns((prev) => prev.map((column) =>
                ({...column, cards: column.cards.map((c) => c.id === cardId ? {...c, title: newTitle} : c)})))
        })
    }

    async function describeCard(cardId: string, description: string) {
        const trimmed = description.trim()
        const stored = trimmed === '' ? null : trimmed
        await attempt('Could not save the description.', async () => {
            await api.updateCard(cardId, {description: stored})
            setColumns((prev) => prev.map((column) => ({
                ...column,
                cards: column.cards.map((c) =>
                    c.id === cardId ? {...c, description: stored} : c
                ),
            })))
        })
    }

    // Attaching changes what the card carries, so the board is reloaded from
    // the server rather than guessed at locally.
    async function toggleCardLabel(cardId: string, labelId: string, attached: boolean) {
        if (!boardId) return
        await attempt('Could not change the labels.', async () => {
            if (attached) {
                await api.detachLabel(cardId, labelId)
            } else {
                await api.attachLabel(cardId, labelId)
            }
            setColumns(await api.fetchColumns(boardId))
        })
    }

    async function addColumn(title: string) {
        if (!boardId) return
        await attempt('Could not add the column.', async () => {
            const newColumn: Column = await api.createColumn(boardId, title)
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
        if (!boardId) return
        await attempt('Could not save the new order.', async () => {
            await api.saveBoard(boardId, updatedColumns)
        })
    }

    return {
        // Derived rather than cleared in an effect, which would cost an extra
        // render pass every time the board changes.
        columns: boardId ? columns : [],
        setColumns,
        error,
        dismissError,
        addCard,
        deleteCard,
        editCard,
        describeCard,
        toggleCardLabel,
        addColumn,
        editColumn,
        deleteColumn,
        saveBoard,
        isDraggingRef
    }

}
