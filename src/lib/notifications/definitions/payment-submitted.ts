import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type PaymentSubmittedData = {
  eventId: string
  orderNumber: string
  customerName: string
}

/**
 * Organisator: een klant heeft een betaalbewijs ingediend en wacht nu op
 * handmatige controle (BR-607). Dit is de melding die er echt toe doet — de
 * klant is nu geblokkeerd op de organisator.
 */
export const paymentSubmitted = defineNotification<PaymentSubmittedData>({
  key: 'payment.submitted',
  label: 'Betaling controleren',
  description:
    'Zodra een klant een betaalbewijs indient dat je moet bevestigen.',
  audienceKind: 'organizer',
  toggleable: true,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Betaalbewijs ontvangen',
    body: `${truncate(data.customerName, 32)} · #${data.orderNumber}`,
    url: `/events/${data.eventId}/orders`,
    tag: `payment-submitted:${data.orderNumber}`,
  }),
})
