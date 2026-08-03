/**
 * A due date is a calendar day. The API sends it as an instant at UTC
 * midnight, so every reading here goes through UTC; using local getters
 * would show the day before for anyone west of Greenwich.
 */

/** The day part of what the API sent, as YYYY-MM-DD, for a date input. */
export function toInputValue(dueDate: string | null | undefined): string {
    if (!dueDate) return ''
    const parsed = new Date(dueDate)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 10)
}

/** Today where the user is, so "overdue" matches the date on their wall. */
export function todayLocal(): string {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 10)
}

export function isOverdue(dueDate: string | null | undefined): boolean {
    const day = toInputValue(dueDate)
    if (!day) return false
    // ISO days compare correctly as plain strings.
    return day < todayLocal()
}

export function isToday(dueDate: string | null | undefined): boolean {
    const day = toInputValue(dueDate)
    return day !== '' && day === todayLocal()
}

/** Short label for the badge on a card, e.g. "5 Aug". */
export function formatDueDate(dueDate: string | null | undefined): string {
    const day = toInputValue(dueDate)
    if (!day) return ''
    const [year, month, date] = day.split('-').map(Number)
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    const label = `${date} ${months[month - 1]}`
    // The year only earns its place when it is not the current one.
    return year === new Date().getFullYear() ? label : `${label} ${year}`
}
