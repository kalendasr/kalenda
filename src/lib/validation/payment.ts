import { z } from 'zod'

/**
 * Betaalinstellingen van de organisatie (DATABASE_DOMAIN.md §4, BR-103).
 *
 * Betaalgegevens horen bij de organisatie, nooit bij een evenement. De
 * ondersteunde WhatsApp-apps zijn een vaste enum (Mope, Uni5Pay), nooit een
 * samengevoegde string (DATABASE_DOMAIN.md §9).
 */

export const paymentApps = ['Mope', 'Uni5Pay'] as const
export const paymentAppSchema = z.enum(paymentApps)
export type PaymentAppValue = (typeof paymentApps)[number]

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const paymentSettingsSchema = z
  .object({
    whatsappEnabled: z.boolean(),
    whatsappPhone: optionalText,
    whatsappApps: z.array(paymentAppSchema).default([]),
    bankEnabled: z.boolean(),
    bankName: optionalText,
    accountHolder: optionalText,
    accountNumber: optionalText,
    branch: optionalText,
    paymentInstructions: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.whatsappEnabled) {
      if (!data.whatsappPhone) {
        ctx.addIssue({
          code: 'custom',
          path: ['whatsappPhone'],
          message: 'Vul het WhatsApp-nummer in waar klanten kunnen betalen.',
        })
      }
      if (data.whatsappApps.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['whatsappApps'],
          message: 'Kies minimaal één betaalapp (Mope of Uni5Pay).',
        })
      }
    }

    if (data.bankEnabled) {
      if (!data.bankName) {
        ctx.addIssue({
          code: 'custom',
          path: ['bankName'],
          message: 'Vul de naam van de bank in.',
        })
      }
      if (!data.accountHolder) {
        ctx.addIssue({
          code: 'custom',
          path: ['accountHolder'],
          message: 'Vul de naam van de rekeninghouder in.',
        })
      }
      if (!data.accountNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['accountNumber'],
          message: 'Vul het rekeningnummer in.',
        })
      }
    }
  })

export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>

// --- Fase 5: betalingsverwerking ---------------------------------------------

/** Organisator bevestigt/keurt een betaling goed (BR-602/603). */
export const approvePaymentSchema = z.object({
  orderId: z.uuid(),
})

/** Organisator keurt een betaling af (BR-603/607). */
export const rejectPaymentSchema = z.object({
  orderId: z.uuid(),
  notes: z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
})

/** Klant dient een bankbetaalbewijs in (BR-603). */
export function parseProofUpload(data: unknown): {
  orderNumber: string
  reference?: string
  file: File
} {
  if (!(data instanceof FormData)) {
    throw new Error('Er is geen betaalbewijs ontvangen.')
  }
  const orderNumber = data.get('orderNumber')
  if (typeof orderNumber !== 'string' || orderNumber === '') {
    throw new Error('Er ontbreekt een bestelnummer.')
  }
  const reference = data.get('reference')
  if (reference !== null && typeof reference !== 'string') {
    throw new Error('Vul een geldige betalingsreferentie in.')
  }
  const file = data.get('file')
  return {
    orderNumber,
    reference:
      typeof reference === 'string' ? reference.trim() || undefined : undefined,
    file: file as File,
  }
}
