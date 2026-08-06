import type { PaymentApp } from '#/generated/prisma/client.ts'

import { formatSrd } from '#/lib/money.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'

/**
 * Bouwt de vooringevulde WhatsApp-tekst voor een betaalverzoek (BR-602).
 *
 * Het platform stelt de tekst samen zodat de organisator niets hoeft te typen
 * en nooit een verkeerd bedrag of ordernummer doorgeeft — alleen op verzenden
 * drukken in het geopende gesprek.
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */

const PAYMENT_APP_LABELS: Record<PaymentApp, string> = {
  Mope: 'Mopé',
  Uni5Pay: 'Uni5Pay',
}

export function buildPaymentRequestMessage(params: {
  customerFirstName: string
  eventTitle: string
  orderNumber: string
  totalCents: number
  paymentApp: PaymentApp | null
  orderUrl: string
  expiresAt: Date
}): string {
  const {
    customerFirstName,
    eventTitle,
    orderNumber,
    totalCents,
    paymentApp,
    orderUrl,
    expiresAt,
  } = params

  const appLine = paymentApp
    ? `Je kunt betalen via ${PAYMENT_APP_LABELS[paymentApp]}.`
    : 'Je ontvangt zo een betaalverzoek.'

  return [
    `Hoi ${customerFirstName}, bedankt voor je bestelling voor ${eventTitle}!`,
    `Bestelnummer: ${orderNumber}`,
    `Te betalen: ${formatSrd(totalCents)}`,
    appLine,
    `Betaal vóór ${formatDateTimeNl(expiresAt)}, anders vervalt de reservering.`,
    `Bekijk je bestelling: ${orderUrl}`,
  ].join('\n')
}
