import type {Label} from '../types'

type LabelFilterProps = {
    labels: Label[]
    activeIds: Set<string>
    onToggle: (labelId: string) => void
    onClear: () => void
}

export function LabelFilter({labels, activeIds, onToggle, onClear}: LabelFilterProps) {
    if (labels.length === 0) return null

    return (
        <div className="label-filter" role="group" aria-label="Filter by label">
            <span className="label-filter-title">Filter</span>
            {labels.map((label) => {
                const active = activeIds.has(label.id)
                return (
                    <button
                        key={label.id}
                        type="button"
                        className={`label-chip label-${label.colour}${active ? ' is-on' : ''}`}
                        onClick={() => onToggle(label.id)}
                        aria-pressed={active}
                    >
                        {label.name}
                    </button>
                )
            })}
            {activeIds.size > 0 && (
                <button type="button" className="label-filter-clear" onClick={onClear}>
                    Clear
                </button>
            )}
        </div>
    )
}
