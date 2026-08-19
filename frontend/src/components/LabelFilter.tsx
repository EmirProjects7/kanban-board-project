import type {Label} from '../types'

type LabelFilterProps = {
    labels: Label[]
    activeIds: Set<string>
    onToggle: (labelId: string) => void
    overdueOnly: boolean
    onToggleOverdue: () => void
    onClear: () => void
}

export function LabelFilter({
    labels,
    activeIds,
    onToggle,
    overdueOnly,
    onToggleOverdue,
    onClear,
}: LabelFilterProps) {
    // The overdue toggle does not depend on the board having labels, so the bar
    // now earns its place either way.
    const filtering = activeIds.size > 0 || overdueOnly

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
            <button
                type="button"
                className={`overdue-chip${overdueOnly ? ' is-on' : ''}`}
                onClick={onToggleOverdue}
                aria-pressed={overdueOnly}
            >
                Overdue
            </button>
            {filtering && (
                <button type="button" className="label-filter-clear" onClick={onClear}>
                    Clear
                </button>
            )}
        </div>
    )
}
