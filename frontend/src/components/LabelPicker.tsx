import {useState} from 'react'
import {LABEL_COLOURS} from '../types'
import type {Label, LabelColour} from '../types'

type LabelPickerProps = {
    labels: Label[]
    attachedIds: Set<string>
    onToggle: (labelId: string, attached: boolean) => void
    onCreate: (name: string, colour: LabelColour) => void
}

export function LabelPicker({labels, attachedIds, onToggle, onCreate}: LabelPickerProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [name, setName] = useState('')
    const [colour, setColour] = useState<LabelColour>('grey')

    function handleCreate() {
        const trimmed = name.trim()
        if (!trimmed) return
        onCreate(trimmed, colour)
        setName('')
        setColour('grey')
        setIsAdding(false)
    }

    return (
        <div className="label-picker">
            {labels.length === 0 && !isAdding && (
                <p className="label-empty">No labels on this board yet.</p>
            )}

            <div className="label-choices">
                {labels.map((label) => {
                    const attached = attachedIds.has(label.id)
                    return (
                        <button
                            key={label.id}
                            type="button"
                            className={`label-chip label-${label.colour}${attached ? ' is-on' : ''}`}
                            onClick={() => onToggle(label.id, attached)}
                            aria-pressed={attached}
                        >
                            {label.name}
                        </button>
                    )
                })}
            </div>

            {isAdding ? (
                <div className="label-new">
                    <input
                        className="label-name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate()
                            if (e.key === 'Escape') setIsAdding(false)
                        }}
                        placeholder="Label name"
                        aria-label="New label name"
                        autoFocus
                    />
                    <div className="label-colours" role="radiogroup" aria-label="Label colour">
                        {LABEL_COLOURS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={colour === option}
                                aria-label={option}
                                className={`label-swatch label-${option}${
                                    colour === option ? ' is-on' : ''
                                }`}
                                onClick={() => setColour(option)}
                            />
                        ))}
                    </div>
                    <button type="button" className="label-action" onClick={handleCreate}>
                        Add
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="label-action"
                    onClick={() => setIsAdding(true)}
                >
                    + New label
                </button>
            )}
        </div>
    )
}
