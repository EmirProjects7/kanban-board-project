import {z} from 'zod'

export const titleSchema = z.object({
    title: z.string().trim().min(1).max(255),
})

// Kept to a fixed set rather than free text, so a label can never carry a
// value that ends up in a style attribute unchecked.
export const LABEL_COLOURS = [
    'grey',
    'red',
    'amber',
    'green',
    'blue',
    'purple',
] as const

export const labelSchema = z.object({
    name: z.string().trim().min(1).max(40),
    colour: z.enum(LABEL_COLOURS),
})

// A due date is a calendar day, so it arrives as YYYY-MM-DD and is turned
// into UTC midnight. Parsing the bare string instead would read it in the
// server's timezone and could land on the day before.
const dueDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .refine((value) => {
        const parsed = new Date(`${value}T00:00:00Z`)
        // The validity check comes first: toISOString throws on an invalid
        // date, which would surface as a 500 rather than a rejected field.
        if (Number.isNaN(parsed.getTime())) return false
        // Round-tripping catches 2026-02-31, which Date rolls forward to March
        // instead of refusing.
        return parsed.toISOString().slice(0, 10) === value
    }, 'Not a real date')
    .transform((value) => new Date(`${value}T00:00:00Z`))

// A card update can carry a title, a description, a due date, or any mix.
// Sending none of them is pointless, so it is rejected rather than silently
// doing nothing.
export const cardUpdateSchema = z
    .object({
        title: z.string().trim().min(1).max(255).optional(),
        // Empty means the note was cleared, which is stored as null rather
        // than an empty string so "no description" has one representation.
        description: z
            .string()
            .trim()
            .max(2000)
            .transform((value) => (value === '' ? null : value))
            .nullable()
            .optional(),
        dueDate: dueDateSchema.nullable().optional(),
    })
    .refine(
        (body) =>
            body.title !== undefined ||
            body.description !== undefined ||
            body.dueDate !== undefined,
        {message: 'Nothing to update'}
    )
