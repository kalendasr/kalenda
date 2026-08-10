import { z } from 'zod'

import { paymentAppSchema } from '#/lib/validation/payment.ts'

export const paymentMethods = ['WhatsApp', 'BankTransfer'] as const
export const paymentMethodSchema = z.enum(paymentMethods)
export type PaymentMethodValue = (typeof paymentMethods)[number]

export const checkoutItemSchema = z.object({
  ticketTypeId: z.uuid(),
  quantity: z.number().int().min(1),
})

const baseCheckoutFields = z
  .object({
    phone: z.string().trim().min(1, 'Vul je telefoonnummer in.'),
    paymentMethod: paymentMethodSchema,
    paymentApp: paymentAppSchema.optional(),
    items: z.array(checkoutItemSchema).min(1, 'Kies minimaal één ticket.'),
  })
  .superRefine((data, ctx) => {
    // Bij een WhatsApp-betaalverzoek is de app verplicht (BR-602).
    if (data.paymentMethod === 'WhatsApp' && !data.paymentApp) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentApp'],
        message: 'Kies met welke app je wilt betalen.',
      })
    }
  })

/**
 * Checkout-validatie voor de client-payload (BR-400..BR-503). Identiteit
 * (voornaam/achternaam/e-mail) komt uit de sessie op de server — alleen
 * het telefoonnummer en de betalingsgegevens stuurt de client mee.
 */
export const checkoutClientSchema = baseCheckoutFields
export type CheckoutClientInput = z.infer<typeof checkoutClientSchema>

/**
 * @deprecated Gebruik `checkoutClientSchema`. Behouden voor bestaande
 * formulieren en tests die nog firstName/lastName/email valideren.
 */
export const checkoutSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Vul je voornaam in.'),
    lastName: z.string().trim().min(1, 'Vul je achternaam in.'),
    email: z.email('Vul een geldig e-mailadres in.'),
    phone: z.string().trim().min(1, 'Vul je telefoonnummer in.'),
    paymentMethod: paymentMethodSchema,
    paymentApp: paymentAppSchema.optional(),
    items: z.array(checkoutItemSchema).min(1, 'Kies minimaal één ticket.'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'WhatsApp' && !data.paymentApp) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentApp'],
        message: 'Kies met welke app je wilt betalen.',
      })
    }
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>
