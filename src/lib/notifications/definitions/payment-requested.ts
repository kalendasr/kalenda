import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type PaymentRequestedData = {
  orderNumber: string
  eventTitle: string
}

/**
 * Klant: de organisator heeft het betaalverzoek verstuurd (WhatsApp-flow,
 * BR-602). Zonder deze melding kan de klant niet weten dat de bal nu bij hem
 * ligt — hij ziet alleen dat er "iets moet gebeuren" op de orderpagina.
 */
export const paymentRequested = defineNotification<PaymentRequestedData>({
  key: 'payment.requested',
  label: 'Betaalverzoek verstuurd',
  description: 'Melding aan de klant dat het betaalverzoek onderweg is.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: 'Je betaalverzoek staat klaar',
    body: `${truncate(data.eventTitle, 40)} · #${data.orderNumber}`,
    url: `/bestelling/${data.orderNumber}`,
    tag: `payment-requested:${data.orderNumber}`,
  }),
})
