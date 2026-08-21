type CardSearchProps = {
    query: string
    onChange: (query: string) => void
    matchCount: number
    inputRef?: React.Ref<HTMLInputElement>
}

export function CardSearch({query, onChange, matchCount, inputRef}: CardSearchProps) {
    const searching = query.trim() !== ''

    return (
        <div className="card-search" role="search">
            <input
                ref={inputRef}
                type="search"
                className="card-search-input"
                placeholder="Search cards..."
                value={query}
                onChange={(event) => onChange(event.target.value)}
                // Escape is the way out of a search box everywhere else.
                onKeyDown={(event) => {
                    if (event.key === 'Escape') onChange('')
                }}
                aria-label="Search cards"
            />
            {/* Hidden from the accessibility tree: a screen reader user is not
                reaching for a slash key, and the input already has a label. */}
            {!searching && (
                <kbd className="card-search-hint" aria-hidden="true">
                    /
                </kbd>
            )}
            {/* No Clear of its own. The filter bar carries one that resets
                every rule, and two buttons with the same word doing different
                amounts was worse than the walk to reach it. Escape empties the
                box, as does the control the browser puts in a search input.

                Announced rather than only shown, so the board thinning out is
                not silence for anyone who cannot see it. */}
            {searching && (
                <span className="card-search-count" role="status">
                    {matchCount === 0
                        ? 'No cards match'
                        : `${matchCount} card${matchCount === 1 ? '' : 's'}`}
                </span>
            )}
        </div>
    )
}
