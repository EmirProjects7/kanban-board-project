import {z} from 'zod'

export const titleSchema = z.object({
    title: z.string().trim().min(1).max(255),
})

// A card update can carry a title, a description, or both. Sending neither is
// pointless, so it is rejected rather than silently doing nothing.
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
    })
    .refine((body) => body.title !== undefined || body.description !== undefined, {
        message: 'Nothing to update',
    })
