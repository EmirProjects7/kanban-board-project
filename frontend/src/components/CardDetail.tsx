import {useState, useEffect} from 'react'
import {createPortal} from 'react-dom'
import type {Card} from '../types'

type CardDetailProps = {
    card: Card
    onSaveTitle: (title: string) => void
    onSaveDescription: (description: string) => void
    onDelete: () => void
    onClose: () => void
}

export function CardDetail({
    card,
    onSaveTitle,
    onSaveDescription,
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
