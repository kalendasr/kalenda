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

/**
 * Aantal dat nog beschikbaar is: capaciteit minus wat door orders is
 * gereserveerd (BR-507). `reserved` is standaard 0 wanneer er geen orders zijn.
 */
export function availableQuantity(
  type: { quantity: number },
  reserved = 0,
): number {
  return Math.max(0, type.quantity - reserved)
}

export function ticketSaleStatus(
  type: SaleableTicketType,
  now: Date = new Date(),
  reserved = 0,
): SaleStatus {
  if (!type.visible) return 'hidden'
  if (availableQuantity(type, reserved) <= 0) return 'sold-out'
  if (type.salesStart && now < type.salesStart) return 'not-started'
  if (type.salesEnd && now > type.salesEnd) return 'ended'
  return 'on-sale'
}

/** Kan een bezoeker dit type nu kopen? */
export function isOnSale(
  type: SaleableTicketType,
  now: Date = new Date(),
  reserved = 0,
): boolean {
  return ticketSaleStatus(type, now, reserved) === 'on-sale'
}
