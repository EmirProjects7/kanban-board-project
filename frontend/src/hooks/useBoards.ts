import {useState, useEffect} from 'react'
import * as api from '../api'
import type {Board} from '../types'

const ACTIVE_BOARD_KEY = 'activeBoardId'

export function useBoards(isAuthenticated: boolean) {
    const [boards, setBoards] = useState<Board[]>([])
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function attempt(message: string, action: () => Promise<void>) {
        try {
            await action()
            setError(null)
        } catch (err) {
            console.error(err)
            setError(message)
        }
    }

    useEffect(() => {
        if (!isAuthenticated) return
        api.fetchBoards()
            .then((loaded) => {
                setBoards(loaded)
                // Reopen whatever was last in view, as long as it still exists.
                const remembered = localStorage.getItem(ACTIVE_BOARD_KEY)
                const wanted = loaded.find((board) => board.id === remembered)
                setActiveBoardId(wanted?.id ?? loaded[0]?.id ?? null)
            })
            .catch((err) => {
                console.error(err)
                setError('Could not load your boards.')
            })
    }, [isAuthenticated])

    function selectBoard(boardId: string) {
        setActiveBoardId(boardId)
        localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
    }

    async function addBoard(title: string) {
        await attempt('Could not create the board.', async () => {
            const board = await api.createBoard(title)
            setBoards((prev) => [...prev, board])
            selectBoard(board.id)
        })
    }

    async function renameBoard(boardId: string, title: string) {
        await attempt('Could not rename the board.', async () => {
            await api.updateBoard(boardId, title)
            setBoards((prev) =>
                prev.map((board) => (board.id === boardId ? {...board, title} : board))
            )
        })
    }

    async function removeBoard(boardId: string) {
        await attempt('Could not delete the board.', async () => {
            await api.deleteBoard(boardId)
            setBoards((prev) => {
                const left = prev.filter((board) => board.id !== boardId)
                if (boardId === activeBoardId) {
                    const next = left[0]?.id ?? null
                    setActiveBoardId(next)
                    if (next) localStorage.setItem(ACTIVE_BOARD_KEY, next)
                }
                return left
            })
        })
    }

    async function reorderBoards(ordered: Board[]) {
        // Applied straight away so the drag feels immediate; the request only
        // makes it stick.
        setBoards(ordered)
        await attempt('Could not save the board order.', async () => {
            await api.saveBoardOrder(ordered)
        })
    }

    function dismissError() {
        setError(null)
    }

    return {
        // Derived rather than cleared in an effect, which would cost an extra
        // render pass on every sign out.
        boards: isAuthenticated ? boards : [],
        activeBoardId: isAuthenticated ? activeBoardId : null,
        selectBoard,
        addBoard,
        renameBoard,
        removeBoard,
        reorderBoards,
        error,
        dismissError,
    }
}
