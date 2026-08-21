import type {Label} from '../types'

type LabelFilterProps = {
    labels: Label[]
    activeIds: Set<string>
    onToggle: (labelId: string) => void
    overdueOnly: boolean
    onToggleOverdue: () => void
    /** True while the search box is also narrowing the board. */
    searching: boolean
    onClear: () => void
}

export function LabelFilter({
    labels,
    activeIds,
    onToggle,
    overdueOnly,
    onToggleOverdue,
    searching,
    onClear,
}: LabelFilterProps) {
    // The overdue toggle does not depend on the board having labels, so the bar
    // now earns its place either way.
    //
    // The search counts towards this too. Clear used to reset the labels and
    // the toggle and leave the search running, so the board stayed narrowed
    // with nothing left on screen to explain it, and it did not appear at all
    // when the search was the only thing filtering.
    const filtering = activeIds.size > 0 || overdueOnly || searching

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
