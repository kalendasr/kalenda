import { db } from '#/lib/db.server.ts'

/**
 * Gedeelde eigenaarschapscontrole voor evenementen (security §13).
 *
 * Server-only (`.server.ts`): wordt uitsluitend binnen server-function handlers
 * gebruikt (event.ts, ticket-type.ts). Nooit direct vanuit een route
 * importeren.
 */
export async function requireOwnedEvent(userId: string, eventId: string) {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      organization: { ownerId: userId, deletedAt: null },
    },
  })
  if (!event) throw new Error('EVENT_NOT_FOUND')
  return event
}
