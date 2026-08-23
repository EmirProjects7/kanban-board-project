import {useState, useEffect} from 'react'
import {createPortal} from 'react-dom'
import {LabelPicker} from './LabelPicker'
import {toInputValue} from '../dueDate'
import type {Card, Label, LabelColour} from '../types'

type CardDetailProps = {
    card: Card
    labels: Label[]
    /** Every column on the board, so the card can be sent to any of them. */
    columns: {id: string; title: string}[]
    columnId: string
    onMove: (columnId: string) => void
    onSaveTitle: (title: string) => void
    onSaveDescription: (description: string) => void
    onSaveDueDate: (day: string) => void
    onToggleLabel: (labelId: string, attached: boolean) => void
    onCreateLabel: (name: string, colour: LabelColour) => void
    onDelete: () => void
    onClose: () => void
}

export function CardDetail({
    card,
    labels,
    columns,
    columnId,
    onMove,
    onSaveTitle,
    onSaveDescription,
    onSaveDueDate,
    onToggleLabel,
    onCreateLabel,
    onDelete,
    onClose,
}: CardDetailProps) {
    const [title, setTitle] = useState(card.title)
    const [description, setDescription] = useState(card.description ?? '')

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    function saveTitle() {
        const trimmed = title.trim()
        if (!trimmed) {
            setTitle(card.title)
            return
        }
        if (trimmed !== card.title) onSaveTitle(trimmed)
    }

    function saveDescription() {
        if (description.trim() !== (card.description ?? '').trim()) {
            onSaveDescription(description)
        }
    }

    // Rendered into the body so the board's own transforms and overflow
    // cannot clip or offset it.
    return createPortal(
        <>
            <div className="detail-overlay" onClick={onClose} />
            <div className="detail" role="dialog" aria-modal="true" aria-label="Card">
                <div className="detail-header">
                    <input
                        className="detail-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        aria-label="Card title"
                    />
                    <button className="detail-close" onClick={onClose} aria-label="Close card">
                        ×
                    </button>
                </div>

                {columns.length > 1 && (
                    <>
                        <label className="detail-label" htmlFor="card-column">
                            Column
                        </label>
                        {/* Dragging is the quick way and stays the quick way.
                            This is the one that works on a touch screen, from
                            the keyboard, and across a board too wide to drag
                            over in one go. */}
                        <select
                            id="card-column"
                            className="detail-column"
                            value={columnId}
                            onChange={(event) => onMove(event.target.value)}
                        >
                            {columns.map((column) => (
                                <option key={column.id} value={column.id}>
                                    {column.title}
                                </option>
                            ))}
                        </select>
                    </>
                )}

                <label className="detail-label" htmlFor="card-due-date">
                    Due date
                </label>
                <div className="detail-due">
                    <input
                        id="card-due-date"
                        type="date"
                        className="detail-due-input"
                        value={toInputValue(card.dueDate)}
                        onChange={(e) => onSaveDueDate(e.target.value)}
                    />
                    {card.dueDate && (
                        <button
                            type="button"
                            className="detail-due-clear"
                            onClick={() => onSaveDueDate('')}
                        >
                            Clear
                        </button>
                    )}
                </div>

                <span className="detail-label">Labels</span>
                <LabelPicker
                    labels={labels}
                    attachedIds={new Set((card.labels ?? []).map((l) => l.label.id))}
                    onToggle={onToggleLabel}
                    onCreate={onCreateLabel}
                />

                <label className="detail-label" htmlFor="card-description">
                    Description
                </label>
                <textarea
                    id="card-description"
                    className="detail-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={saveDescription}
                    placeholder="Add more detail..."
                    rows={7}
                />

                <div className="detail-actions">
                    <button className="detail-delete" onClick={onDelete}>
                        Delete card
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}
