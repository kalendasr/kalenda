/**
 * Verkoopstatus van een tickettype (BUSINESS_RULES BR-301..BR-303).
 *
 * Puur en testbaar. In Fase 3 zijn er nog geen orders, dus de beschikbaarheid is
 * gelijk aan de capaciteit; Fase 4 trekt hier de verkochte aantallen van af.
 */

export type SaleStatus =
  'on-sale' | 'not-started' | 'ended' | 'sold-out' | 'hidden'

export type SaleableTicketType = {
  quantity: number
  visible: boolean
  salesStart: Date | null
  salesEnd: Date | null
}

/** Aantal dat nog beschikbaar is (Fase 3: gelijk aan de capaciteit). */
export function availableQuantity(type: { quantity: number }): number {
  return type.quantity
}

export function ticketSaleStatus(
  type: SaleableTicketType,
  now: Date = new Date(),
): SaleStatus {
  if (!type.visible) return 'hidden'
  if (availableQuantity(type) <= 0) return 'sold-out'
  if (type.salesStart && now < type.salesStart) return 'not-started'
  if (type.salesEnd && now > type.salesEnd) return 'ended'
  return 'on-sale'
}

/** Kan een bezoeker dit type nu kopen? */
export function isOnSale(
  type: SaleableTicketType,
  now: Date = new Date(),
): boolean {
  return ticketSaleStatus(type, now) === 'on-sale'
}
