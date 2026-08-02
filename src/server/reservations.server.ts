import { db } from '#/lib/db.server.ts'

/**
 * Telt hoeveel tickets per tickettype gereserveerd zijn door lopende orders.
 *
 * Server-only helper. Een order reserveert zolang hij Paid/Completed is, of
 * nog niet verlopen wacht op betaling/controle (lazy expiry, BR-506/507).
 * Verlopen onbetaalde orders tellen dus niet mee en geven hun plekken vrij.
 */
export async function reservedByTicketType(
  ticketTypeIds: Array<string>,
  now: Date = new Date(),
): Promise<Record<string, number>> {
  if (ticketTypeIds.length === 0) return {}

  const grouped = await db.orderItem.groupBy({
    by: ['ticketTypeId'],
    where: {
      ticketTypeId: { in: ticketTypeIds },
      order: {
        deletedAt: null,
        OR: [
          { orderStatus: { in: ['Paid', 'Completed'] } },
          {
            orderStatus: { in: ['PendingPayment', 'AwaitingReview'] },
            expiresAt: { gt: now },
          },
        ],
      },
    },
    _sum: { quantity: true },
  })

  const result: Record<string, number> = {}
  for (const row of grouped) {
    result[row.ticketTypeId] = row._sum.quantity ?? 0
  }
  return result
}
