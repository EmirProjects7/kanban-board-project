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

    // Same as in useBoards: a failed load otherwise leaves an empty board on
    // screen with no way back other than reloading the page.
    const [attemptCount, setAttemptCount] = useState(0)

    function retryLoad() {
        setAttemptCount((count) => count + 1)
    }

    useEffect(() => {
        if (!boardId) return
        api.fetchColumns(boardId)
            .then((data) => {
                setColumns(data)
                setError(null)
            })
            .catch((err) => {
                console.error(err)
                setError('Could not load the board.')
            })
    }, [boardId, attemptCount])

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
            // The write is broadcast to this session too, and that message can
            // arrive before the response it came from. Appending either way
            // would put the same card in the column twice.
            setColumns((prev) =>
                prev.map((column) => {
                    if (column.id !== columnId) return column
                    if (column.cards.some((c) => c.id === newCard.id)) return column
                    return {...column, cards: [...column.cards, newCard]}
                })
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

    // The empty string means the date was cleared. Sent as null so "no due
    // date" has one representation, matching how the description works.
    async function setCardDueDate(cardId: string, day: string) {
        const stored = day === '' ? null : day
        await attempt('Could not save the due date.', async () => {
            await api.updateCard(cardId, {dueDate: stored})
            setColumns((prev) => prev.map((column) => ({
                ...column,
                cards: column.cards.map((c) =>
                    c.id === cardId
                        ? {...c, dueDate: stored ? `${stored}T00:00:00.000Z` : null}
                        : c
                ),
            })))
        })
    }

    // Dragging was the only way to move a card, which leaves a touch screen
    // or a keyboard with no route at all. The whole board goes out, the same
    // payload a drop sends, so both ways land on one ordering rule.
    async function moveCard(cardId: string, targetColumnId: string) {
        if (!boardId) return
        const source = columns.find((column) =>
            column.cards.some((card) => card.id === cardId)
        )
        const card = source?.cards.find((c) => c.id === cardId)
        if (!source || !card || source.id === targetColumnId) return

        const previous = columns
        const moved = columns.map((column) => {
            if (column.id === source.id) {
                return {...column, cards: column.cards.filter((c) => c.id !== cardId)}
            }
            if (column.id === targetColumnId) {
                return {...column, cards: [...column.cards, card]}
            }
            return column
        })
        setColumns(moved)

        await attempt('Could not move the card.', async () => {
            try {
                await api.saveBoard(boardId, moved)
            } catch (err) {
                // Nothing else will correct this: a rejected write is never
                // broadcast, so the card would sit in a column the server
                // knows nothing about until the page is reloaded.
                setColumns(previous)
                throw err
            }
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
            // Same race as addCard: the broadcast for this write can beat the
            // response, leaving the column already in place.
            setColumns((prev) =>
                prev.some((column) => column.id === newColumn.id) ? prev : [...prev, newColumn]
            )
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
        setCardDueDate,
        moveCard,
        toggleCardLabel,
        addColumn,
        editColumn,
        deleteColumn,
        saveBoard,
        retryLoad,
        isDraggingRef
    }

}
