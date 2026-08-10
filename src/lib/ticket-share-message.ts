/**
 * Bouwt de vooringevulde WhatsApp-tekst om tickets met de klant te delen
 * (BR-704, Fase 9).
 *
 * Zelfde patroon als `payment-request-message.ts`: het platform stelt de
 * tekst samen zodat de organisator alleen op verzenden hoeft te drukken in
 * het geopende gesprek — het platform verstuurt zelf niets (BR-600).
 *
 * Puur en zonder afhankelijkheden, zodat het los te testen is.
 */
export function buildTicketShareMessage(params: {
  customerFirstName: string
  eventTitle: string
  orderUrl: string
}): string {
  const { customerFirstName, eventTitle, orderUrl } = params

  return [
    `Hoi ${customerFirstName}, hier zijn je tickets voor ${eventTitle}:`,
    orderUrl,
  ].join('\n')
}
