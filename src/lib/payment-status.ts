import type { PaymentStatus } from '#/generated/prisma/enums.ts'

/**
 * Labels voor `Order.paymentStatus` — de betaaltoestand zoals die op de
 * bestelling geprojecteerd staat (BR-604).
 *
 * Bewust gescheiden van `OrderStatus` (waar staat de bestelling in het
 * traject, BR-505) én van `PaymentState` (de volledige toestand van het
 * betaalrecord, `payment-transitions.ts`). Die drie worden in de
 * beheerdersschermen naast elkaar getoond en mogen nooit tot één kolom
 * versmelten: een geannuleerde bestelling kan een geverifieerde betaling
 * hebben, en een betaalde bestelling kan nog op ticketuitgifte wachten.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Unpaid: 'Niet betaald',
  Pending: 'In behandeling',
  Verified: 'Geverifieerd',
  Rejected: 'Afgewezen',
}

export function paymentStatusBadgeVariant(
  status: PaymentStatus,
): 'soft-success' | 'soft-warning' | 'soft-destructive' | 'soft-muted' {
  if (status === 'Verified') return 'soft-success'
  if (status === 'Pending') return 'soft-warning'
  if (status === 'Rejected') return 'soft-destructive'
  return 'soft-muted'
}
