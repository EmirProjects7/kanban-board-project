type CardSearchProps = {
    query: string
    onChange: (query: string) => void
    matchCount: number
}

export function CardSearch({query, onChange, matchCount}: CardSearchProps) {
    const searching = query.trim() !== ''

    return (
        <div className="card-search" role="search">
            <input
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
            {searching && (
                <>
                    {/* Announced rather than only shown, so it is not silence
                        for anyone who cannot see the board thin out. */}
                    <span className="card-search-count" role="status">
                        {matchCount === 0
                            ? 'No cards match'
                            : `${matchCount} card${matchCount === 1 ? '' : 's'}`}
                    </span>
                    <button
                        type="button"
                        className="card-search-clear"
                        onClick={() => onChange('')}
                    >
                        Clear
                    </button>
                </>
            )}
        </div>
    )
}
