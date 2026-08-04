import { db } from '#/lib/db.server.ts'

/**
 * Gedeelde eigenaarschapscontrole voor organisaties (security §13).
 *
 * Server-only (`.server.ts`): wordt uitsluitend binnen server-function handlers
 * gebruikt (organization.ts, event.ts, dashboard.ts). Nooit direct vanuit een
 * route importeren.
 */
export async function requireOwnedOrganization(userId: string) {
  const organization = await db.organization.findFirst({
    where: { ownerId: userId, deletedAt: null },
  })

  if (!organization) {
    throw new Error('ORGANIZATION_NOT_FOUND')
  }

  return organization
}
