import { defineNotification } from '#/lib/notifications/types.ts'

export type PaymentRejectedData = {
  orderNumber: string
  eventTitle: string
}

/**
 * Klant: het ingediende betaalbewijs is afgekeurd (BR-606/903). De klant kan
 * direct opnieuw indienen (BR-605) — zonder deze melding zou hij dat pas
 * merken bij een toevallig bezoek aan de orderpagina.
 */
export const paymentRejected = defineNotification<PaymentRejectedData>({
  key: 'payment.rejected',
  label: 'Betaling afgekeurd',
  description: 'Melding aan de klant dat het betaalbewijs is afgekeurd.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Je betaalbewijs is afgekeurd',
    body: 'Bekijk de reden en dien een nieuw bewijs in.',
    url: `/bestelling/${data.orderNumber}`,
    tag: `payment-rejected:${data.orderNumber}`,
  }),
})
