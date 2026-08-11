import { db } from '#/lib/db.server.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

type TransactionClient = Prisma.TransactionClient

/**
 * Telt hoeveel tickets per tickettype gereserveerd zijn door lopende orders.
 *
 * Server-only helper. Een order reserveert zolang hij Paid/Completed is, of
 * nog niet verlopen wacht op betaling/controle (lazy expiry, BR-506/507).
 * Verlopen onbetaalde orders tellen dus niet mee en geven hun plekken vrij.
 *
 * Geef `tx` mee wanneer je binnen een transactie draait, zodat de telling de
 * vooraf genomen rij-locks respecteert en niet via de globale client leest.
 */
export async function reservedByTicketType(
  ticketTypeIds: Array<string>,
  now: Date = new Date(),
  tx: TransactionClient = db,
): Promise<Record<string, number>> {
  if (ticketTypeIds.length === 0) return {}

  const grouped = await tx.orderItem.groupBy({
    by: ['ticketTypeId'],
    where: {
      ticketTypeId: { in: ticketTypeIds },
      order: {
        deletedAt: null,
        // Moet exact overeenkomen met `RESERVING_STATUSES`/`EXPIRABLE_STATUSES`
        // in order-status.ts: alleen `PendingPayment` verloopt vanzelf. Zodra
        // een klant bewijs heeft ingediend (`AwaitingReview`) houdt de order
        // capaciteit vast totdat de organisator hem goed- of afkeurt, ook na
        // 48 uur — anders worden diezelfde plaatsen dubbel verkocht terwijl
        // de order nog in behandeling is.
        OR: [
          { orderStatus: { in: ['AwaitingReview', 'Paid', 'Completed'] } },
          {
            orderStatus: 'PendingPayment',
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
