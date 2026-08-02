import {useState, useEffect} from 'react'
import * as api from '../api'
import type {Label, LabelColour} from '../types'

export function useLabels(boardId: string | null) {
    const [labels, setLabels] = useState<Label[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!boardId) return
        api.fetchLabels(boardId)
            .then((loaded) => setLabels(loaded))
            .catch((err) => {
                console.error(err)
                setError('Could not load the labels.')
            })
    }, [boardId])

    async function attempt(message: string, action: () => Promise<void>) {
        try {
            await action()
            setError(null)
        } catch (err) {
            console.error(err)
            setError(message)
        }
    }

    async function addLabel(name: string, colour: LabelColour) {
        if (!boardId) return
        await attempt('Could not create the label.', async () => {
            const label = await api.createLabel(boardId, name, colour)
            setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)))
        })
    }

    async function editLabel(labelId: string, name: string, colour: LabelColour) {
        await attempt('Could not save the label.', async () => {
            await api.updateLabel(labelId, name, colour)
            setLabels((prev) =>
                prev
                    .map((label) => (label.id === labelId ? {...label, name, colour} : label))
                    .sort((a, b) => a.name.localeCompare(b.name))
            )
        })
    }

    async function removeLabel(labelId: string) {
        await attempt('Could not delete the label.', async () => {
            await api.deleteLabel(labelId)
            setLabels((prev) => prev.filter((label) => label.id !== labelId))
        })
    }

    function dismissError() {
        setError(null)
    }

    return {
        // Derived rather than cleared in an effect, which would cost an extra
        // render pass whenever the board changes.
        labels: boardId ? labels : [],
        addLabel,
        editLabel,
        removeLabel,
        error,
        dismissError,
    }
}
