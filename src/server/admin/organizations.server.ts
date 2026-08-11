import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { REALISED_ORDER_STATUSES } from '#/lib/order-status.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import type { ListOrganizationsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Organisatiebeheer voor de platformbeheerder (Fase 12).
 *
 * "Deactiveren" is bewust dezelfde soft delete (`deletedAt`) die de rest van
 * de applicatie al kent: `requireOwnedOrganization` filtert erop (de
 * organisator verliest direct zijn workspace) en `publishedWhere` filtert er
 * ook op (de evenementen verdwijnen van de storefront). Een parallel
 * "geblokkeerd"-veld zou twee bronnen van waarheid opleveren voor dezelfde
 * toestand.
 */

function buildOrganizationWhere(
  input: ListOrganizationsInput,
): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {}

  if (input.status === 'active') where.deletedAt = null
  if (input.status === 'deactivated') where.deletedAt = { not: null }

  if (input.verification === 'verified') where.isVerified = true
  if (input.verification === 'unverified') where.isVerified = false

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { name: containsInsensitive(search) },
      { slug: containsInsensitive(search) },
      { owner: { email: containsInsensitive(search) } },
    ]
  }

  return where
}

export async function listOrganizationsHandler(data: ListOrganizationsInput) {
  await requirePlatformAdmin()

  const where = buildOrganizationWhere(data)
  const orderBy = {
    [data.sort]: data.direction,
  } as Prisma.OrganizationOrderByWithRelationInput

  return paginateQuery(data, {
    findMany: ({ skip, take }) =>
      db.organization.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          isVerified: true,
          deletedAt: true,
          createdAt: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { events: true } },
        },
      }),
    count: () => db.organization.count({ where }),
  })
}

export async function getOrganizationDetailHandler(data: {
  organizationId: string
}) {
  await requirePlatformAdmin()

  const organization = await db.organization.findUnique({
    where: { id: data.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      email: true,
      phone: true,
      website: true,
      city: true,
      country: true,
      isVerified: true,
      deletedAt: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          blockedAt: true,
          deletedAt: true,
        },
      },
      paymentSettings: {
        select: {
          whatsappEnabled: true,
          whatsappApps: true,
          bankEnabled: true,
          bankName: true,
        },
      },
      _count: { select: { events: true } },
    },
  })

  if (!organization) throw new Error('ORGANIZATION_NOT_FOUND')

  const [events, sales, ticketsSold] = await Promise.all([
    db.event.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.order.aggregate({
      where: {
        deletedAt: null,
        orderStatus: { in: [...REALISED_ORDER_STATUSES] },
        event: { organizationId: organization.id },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    db.ticket.count({
      where: {
        status: { in: ['Issued', 'Sent', 'CheckedIn'] },
        orderItem: {
          order: {
            deletedAt: null,
            event: { organizationId: organization.id },
          },
        },
      },
    }),
  ])

  return {
    organization,
    events,
    realisedRevenueCents: sales._sum.totalCents ?? 0,
    realisedOrderCount: sales._count._all,
    ticketsSold,
  }
}

export async function setOrganizationActiveHandler(data: {
  organizationId: string
  active: boolean
}) {
  const admin = await requirePlatformAdmin()

  const organization = await db.organization.findUnique({
    where: { id: data.organizationId },
    select: { id: true, name: true, deletedAt: true },
  })
  if (!organization) throw new Error('ORGANIZATION_NOT_FOUND')

  await db.organization.update({
    where: { id: organization.id },
    data: { deletedAt: data.active ? null : new Date() },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: data.active ? 'OrganizationReactivated' : 'OrganizationDeactivated',
    targetType: 'Organization',
    targetId: organization.id,
    targetLabel: organization.name,
  })

  return { success: true }
}

/**
 * Verificatie is een platformoordeel over de betrouwbaarheid van een
 * organisator en daarmee expliciet géén organisator-instelling — alleen een
 * beheerder kan hem zetten.
 */
export async function setOrganizationVerifiedHandler(data: {
  organizationId: string
  verified: boolean
}) {
  const admin = await requirePlatformAdmin()

  const organization = await db.organization.findUnique({
    where: { id: data.organizationId },
    select: { id: true, name: true, isVerified: true },
  })
  if (!organization) throw new Error('ORGANIZATION_NOT_FOUND')

  await db.organization.update({
    where: { id: organization.id },
    data: { isVerified: data.verified },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: data.verified ? 'OrganizationVerified' : 'OrganizationUnverified',
    targetType: 'Organization',
    targetId: organization.id,
    targetLabel: organization.name,
    metadata: {
      before: { isVerified: organization.isVerified },
      after: { isVerified: data.verified },
    },
  })

  return { success: true }
}
