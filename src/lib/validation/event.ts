import { z } from 'zod'

/**
 * Gedeelde validatieschemas voor evenementen (DATABASE_DOMAIN.md §5, §6, §16).
 * Eén bron van waarheid voor client- en serverzijde.
 */

/** Content-types die in Fase 2 beheerd worden (DATABASE_DOMAIN.md §6). */
export const eventContentTypes = ['Agenda', 'Faq', 'Speaker', 'Rules'] as const
export const eventContentTypeSchema = z.enum(eventContentTypes)
export type EventContentTypeValue = (typeof eventContentTypes)[number]

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

/** Aanmaken: alleen een titel is nodig; de rest volgt in de workspace. */
export const createEventSchema = z.object({
  title: z.string().trim().min(2, 'Vul een titel voor je evenement in.'),
})

/**
 * Algemene eventgegevens. Datum/tijd komen als `datetime-local`-strings uit het
 * formulier (bijv. "2026-09-01T20:00"); leeg = niet ingevuld.
 *
 * Omschrijving en coverfoto worden beheerd in de Inhoud-tab (zie
 * `eventIntroSchema`) — één bron van waarheid per gegeven (CLAUDE.md §4).
 */
export const eventDetailsSchema = z
  .object({
    title: z.string().trim().min(2, 'Vul een titel voor je evenement in.'),
    categoryId: optionalText,
    startsAt: optionalText,
    endsAt: optionalText,
    timezone: z.string().trim().min(1).default('America/Paramaribo'),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'De einddatum moet na de startdatum liggen.',
      })
    }
  })

/** Introductie van het evenement: korte en lange omschrijving (Inhoud-tab). */
export const eventIntroSchema = z.object({
  shortDescription: optionalText,
  description: optionalText,
})

/** Locatie (Venue), inline bij het event bewerkt. */
export const venueSchema = z.object({
  name: z.string().trim().min(2, 'Vul de naam van de locatie in.'),
  address: optionalText,
  district: optionalText,
  country: z.string().trim().min(1).default('Suriname'),
})

/** Eén content-item (agenda-punt, FAQ-vraag, spreker of huisregel). */
export const contentItemSchema = z.object({
  type: eventContentTypeSchema,
  title: z.string().trim().min(1, 'Vul een titel in.'),
  content: z.string().trim().min(1, 'Vul de inhoud in.'),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type EventDetailsInput = z.infer<typeof eventDetailsSchema>
export type EventIntroInput = z.infer<typeof eventIntroSchema>
export type VenueInput = z.infer<typeof venueSchema>
export type ContentItemInput = z.infer<typeof contentItemSchema>
