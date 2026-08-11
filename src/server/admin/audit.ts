import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import { listAuditLogsInputSchema } from '#/lib/validation/admin.ts'
import type { ListAuditLogsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Audit log inzien (Fase 12) — uitsluitend lezend, en alleen voor
 * platformbeheerders.
 *
 * Er bestaat bewust geen enkele server function die een auditregel wijzigt of
 * verwijdert: een log dat je kunt aanpassen is geen log. Schrijven gebeurt
 * alleen server-side via `writeAuditLog()`, als neveneffect van een al
 * geautoriseerde beheerdersactie.
 */

function buildAuditWhere(input: ListAuditLogsInput): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}

  if (input.targetType !== 'all') where.targetType = input.targetType
  if (input.actorId) where.actorId = input.actorId
  if (input.targetId) where.targetId = input.targetId

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { targetLabel: containsInsensitive(search) },
      { actor: { name: containsInsensitive(search) } },
      { actor: { email: containsInsensitive(search) } },
    ]
  }

  return where
}

export const listAuditLogs = createServerFn({ method: 'GET' })
  .validator(listAuditLogsInputSchema)
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    const where = buildAuditWhere(data)

    return paginateQuery(data, {
      findMany: ({ skip, take }) =>
        db.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            targetLabel: true,
            metadata: true,
            createdAt: true,
            actor: { select: { id: true, name: true, email: true } },
          },
        }),
      count: () => db.auditLog.count({ where }),
    })
  })
