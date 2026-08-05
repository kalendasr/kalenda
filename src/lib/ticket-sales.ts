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

/**
 * Drempel voor het "Bijna uitverkocht"-label op de storefront: er is geen
 * bestaande conventie elders in de app voor "bijna vol", dus dit is een
 * expliciete, documenteerde vuistregel — geen BR-regel.
 */
export const ALMOST_SOLD_OUT_THRESHOLD = 10

/**
 * Vat de zichtbare tickettypes van een event samen tot wat de storefront
 * nodig heeft om beschikbaarheid te tonen: de laagste "vanaf"-prijs, de
 * resterende capaciteit en of dat "bijna uitverkocht" is. Eén plek voor deze
 * berekening zodat de eventlijst en de detailpagina nooit uit de pas lopen.
 * Verwacht `reserved` al per tickettype samengevoegd (zie `reservedByTicketType`).
 */
export function eventAvailability(
  ticketTypes: Array<{
    priceCents: number
    quantity: number
    reserved: number
  }>,
): {
  priceFromCents: number | null
  isFree: boolean
  capacity: number
  remaining: number
  almostSoldOut: boolean
  soldOut: boolean
} {
  const priceFromCents = ticketTypes.length
    ? Math.min(...ticketTypes.map((type) => type.priceCents))
    : null
  const capacity = ticketTypes.reduce((sum, type) => sum + type.quantity, 0)
  const remaining = ticketTypes.reduce(
    (sum, type) => sum + availableQuantity(type, type.reserved),
    0,
  )

  return {
    priceFromCents,
    isFree: priceFromCents === 0,
    capacity,
    remaining,
    almostSoldOut:
      ticketTypes.length > 0 &&
      remaining > 0 &&
      remaining <= ALMOST_SOLD_OUT_THRESHOLD,
    soldOut: ticketTypes.length > 0 && remaining === 0,
  }
}
