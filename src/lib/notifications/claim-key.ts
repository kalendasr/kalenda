/**
 * Bouwers voor de `targetKey` van een `NotificationLog`-claim. Puur en
 * deterministisch: dezelfde gebeurtenis levert altijd exact dezelfde sleutel,
 * zodat een melding maar één keer verstuurd wordt.
 *
 * LET OP: wijzig een bestaande sleutel nooit lichtvaardig — een andere string
 * betekent dat álle eerder verstuurde meldingen opnieuw als "nog niet verstuurd"
 * gelden. Daarom pinnen de tests de exacte waarden vast.
 */

/** Herinnering per event (organisator). */
export function eventReminderKey(eventId: string): string {
  return `event:${eventId}`
}

/** Herinnering per bestelling (klant). */
export function orderReminderKey(orderId: string): string {
  return `order:${orderId}`
}

/** Bijna-uitverkocht-drempel gepasseerd voor een tickettype. */
export function lowStockKey(ticketTypeId: string): string {
  return `ticket-type:${ticketTypeId}:low`
}

/** Volledig uitverkocht voor een tickettype. */
export function soldOutKey(ticketTypeId: string): string {
  return `ticket-type:${ticketTypeId}:soldout`
}
