import { z } from 'zod'

import { parsePriceToCents } from '#/lib/money.ts'

/**
 * Validatie voor tickettypes (DATABASE_DOMAIN.md §7, BR-300..BR-302).
 *
 * De prijs komt als tekst uit het formulier (SRD) en wordt omgezet naar hele
 * centen (`priceCents`) in de output. Datums zijn `datetime-local`-strings.
 */

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const ticketTypeSchema = z
  .object({
    name: z.string().trim().min(2, 'Vul een naam voor het tickettype in.'),
    description: optionalText,
    price: z
      .string()
      .trim()
      .refine(
        (value) => parsePriceToCents(value) !== null,
        'Vul een geldig bedrag in, bijvoorbeeld 50 of 50,00.',
      ),
    quantity: z
      .number({ error: 'Vul een aantal in.' })
      .int('Gebruik een heel getal.')
      .min(1, 'De capaciteit moet minimaal 1 zijn.'),
    minimumPerOrder: z
      .number({ error: 'Vul een minimum in.' })
      .int('Gebruik een heel getal.')
      .min(1, 'Het minimum is ten minste 1.'),
    maximumPerOrder: z
      .number({ error: 'Vul een maximum in.' })
      .int('Gebruik een heel getal.')
      .min(1, 'Het maximum is ten minste 1.'),
    salesStart: optionalText,
    salesEnd: optionalText,
    visible: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.maximumPerOrder < data.minimumPerOrder) {
      ctx.addIssue({
        code: 'custom',
        path: ['maximumPerOrder'],
        message: 'Het maximum mag niet lager zijn dan het minimum.',
      })
    }
    if (data.minimumPerOrder > data.quantity) {
      ctx.addIssue({
        code: 'custom',
        path: ['minimumPerOrder'],
        message: 'Het minimum kan niet groter zijn dan de capaciteit.',
      })
    }
    if (data.salesStart && data.salesEnd && data.salesEnd <= data.salesStart) {
      ctx.addIssue({
        code: 'custom',
        path: ['salesEnd'],
        message: 'Het einde van de verkoop moet na de start liggen.',
      })
    }
  })
  .transform((data) => ({
    ...data,
    // Veilig: de refine hierboven garandeert een geldige prijs.
    priceCents: parsePriceToCents(data.price) ?? 0,
  }))

export type TicketTypeInput = z.input<typeof ticketTypeSchema>
export type TicketTypeOutput = z.output<typeof ticketTypeSchema>
