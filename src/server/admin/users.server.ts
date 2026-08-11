import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { REALISED_ORDER_STATUSES } from '#/lib/order-status.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import type { ListUsersInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Gebruikersbeheer voor de platformbeheerder (Fase 12).
 *
 * Privacy (Fase 5): een beheerder krijgt uitsluitend de velden die hij nodig
 * heeft om te beheren — naam, e-mail, telefoon, rol, status en aantallen.
 * Wachtwoordhashes, OAuth-tokens en sessiegegevens staan in `Account` en
 * `Session` en worden hier nergens geselecteerd.
 *
 * "Rol" is in dit datamodel geen kolom maar een afgeleide (zie
 * `deriveUserRole`): platformbeheerder, organisator (eigenaar van een
 * organisatie) of klant. Alleen de platformbeheerder-vlag is instelbaar;
 * organisator word je door een organisatie aan te maken, niet door een
 * beheerdersknop.
 */

export type AdminUserRole = 'platformAdmin' | 'organizer' | 'customer'

function buildUserWhere(input: ListUsersInput): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}

  // Verwijderde accounts zijn standaard onzichtbaar: ze bestaan nog voor de
  // historie van hun bestellingen, maar horen niet in het dagelijkse beeld.
  if (input.status === 'active') {
    where.deletedAt = null
    where.blockedAt = null
  } else if (input.status === 'blocked') {
    where.deletedAt = null
    where.blockedAt = { not: null }
  } else if (input.status === 'deleted') {
    where.deletedAt = { not: null }
  }

  if (input.role === 'platformAdmin') {
    where.isPlatformAdmin = true
  } else if (input.role === 'organizer') {
    where.organization = { isNot: null }
  } else if (input.role === 'customer') {
    where.isPlatformAdmin = false
    where.organization = { is: null }
  }

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { name: containsInsensitive(search) },
      { email: containsInsensitive(search) },
    ]
  }

  return where
}

/**
 * De handlers staan als gewone functies naast hun server-function-wrapper.
 * `createServerFn` heeft de Start-runtime nodig en is daardoor niet los aan te
 * roepen in een test; deze vorm maakt autorisatie en bedrijfsregels wél
 * testbaar — hetzelfde patroon als `notifyEventChanged` in
 * `server/event-notifications.server.ts`.
 */
export async function listUsersHandler(data: ListUsersInput) {
  await requirePlatformAdmin()

  const where = buildUserWhere(data)
  const orderBy = {
    [data.sort]: data.direction,
  } as Prisma.UserOrderByWithRelationInput

  return paginateQuery(data, {
    findMany: ({ skip, take }) =>
      db.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          isPlatformAdmin: true,
          blockedAt: true,
          deletedAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true, deletedAt: true } },
          _count: { select: { orders: true } },
        },
      }),
    count: () => db.user.count({ where }),
  })
}

export async function getUserDetailHandler(data: { userId: string }) {
  await requirePlatformAdmin()

  const user = await db.user.findUnique({
    where: { id: data.userId },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      emailVerified: true,
      phone: true,
      image: true,
      locale: true,
      timezone: true,
      isPlatformAdmin: true,
      blockedAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          deletedAt: true,
          _count: { select: { events: true } },
        },
      },
      // Alleen aanmeldmethode — nooit tokens of wachtwoordhashes.
      accounts: { select: { providerId: true, createdAt: true } },
    },
  })

  if (!user) throw new Error('USER_NOT_FOUND')

  const [orders, spend] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        totalCents: true,
        expiresAt: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
      },
    }),
    db.order.aggregate({
      where: {
        userId: user.id,
        deletedAt: null,
        orderStatus: { in: [...REALISED_ORDER_STATUSES] },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
  ])

  return {
    user,
    role: deriveUserRole(user),
    recentOrders: orders,
    realisedOrderCount: spend._count._all,
    realisedSpendCents: spend._sum.totalCents ?? 0,
  }
}

export async function setUserBlockedHandler(data: {
  userId: string
  blocked: boolean
}) {
  const admin = await requirePlatformAdmin()

  if (data.userId === admin.id) throw new Error('CANNOT_BLOCK_SELF')

  const target = await db.user.findUnique({
    where: { id: data.userId },
    select: { id: true, name: true, email: true, isPlatformAdmin: true },
  })
  if (!target) throw new Error('USER_NOT_FOUND')

  // Een beheerder blokkeert geen andere beheerder: dat is een rolconflict,
  // geen moderatie. Trek eerst de beheerdersrol in.
  if (target.isPlatformAdmin) throw new Error('CANNOT_BLOCK_ADMIN')

  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: { blockedAt: data.blocked ? new Date() : null },
    }),
    // `getActiveUser()` weigert een geblokkeerd account al, maar we ruimen
    // de sessies ook echt op: een blokkade hoort meteen te gelden, niet pas
    // bij de volgende controle.
    ...(data.blocked
      ? [db.session.deleteMany({ where: { userId: target.id } })]
      : []),
  ])

  await writeAuditLog({
    actorId: admin.id,
    action: data.blocked ? 'UserBlocked' : 'UserUnblocked',
    targetType: 'User',
    targetId: target.id,
    targetLabel: `${target.name} (${target.email})`,
  })

  return { success: true }
}

/**
 * Beheerdersrol toekennen of intrekken.
 *
 * Waarborgen tegen rechtenmisbruik en uitsluiting (Fase 16):
 * - niemand degradeert zichzelf — dan sluit een beheerder zichzelf per
 *   ongeluk buiten;
 * - er blijft altijd minstens één beheerder over — anders is het platform
 *   alleen nog via de database te beheren;
 * - een geblokkeerd of verwijderd account kan geen beheerder worden.
 */
export async function setUserPlatformAdminHandler(data: {
  userId: string
  isPlatformAdmin: boolean
}) {
  const admin = await requirePlatformAdmin()

  if (data.userId === admin.id) throw new Error('CANNOT_CHANGE_OWN_ROLE')

  const target = await db.user.findUnique({
    where: { id: data.userId },
    select: {
      id: true,
      name: true,
      email: true,
      isPlatformAdmin: true,
      blockedAt: true,
      deletedAt: true,
    },
  })
  if (!target) throw new Error('USER_NOT_FOUND')

  if (data.isPlatformAdmin && (target.blockedAt || target.deletedAt)) {
    throw new Error('CANNOT_PROMOTE_INACTIVE_USER')
  }

  if (!data.isPlatformAdmin && target.isPlatformAdmin) {
    const remaining = await db.user.count({
      where: {
        isPlatformAdmin: true,
        deletedAt: null,
        id: { not: target.id },
      },
    })
    if (remaining === 0) throw new Error('LAST_PLATFORM_ADMIN')
  }

  await db.user.update({
    where: { id: target.id },
    data: { isPlatformAdmin: data.isPlatformAdmin },
  })

  await writeAuditLog({
    actorId: admin.id,
    action: data.isPlatformAdmin ? 'UserRoleGranted' : 'UserRoleRevoked',
    targetType: 'User',
    targetId: target.id,
    targetLabel: `${target.name} (${target.email})`,
    metadata: {
      before: { isPlatformAdmin: target.isPlatformAdmin },
      after: { isPlatformAdmin: data.isPlatformAdmin },
    },
  })

  return { success: true }
}

/**
 * Account verwijderen — altijd een soft delete (`deletedAt`).
 *
 * `getActiveUser()` weigert een verwijderd account al, dus de toegang stopt
 * meteen. Harde verwijdering bestaat bewust niet: bestellingen, betalingen en
 * tickets verwijzen naar deze gebruiker en zijn financiële historie
 * (CLAUDE.md §5). Een organisator kan niet verwijderd worden zolang zijn
 * organisatie bestaat — anders blijven events zonder eigenaar achter.
 */
export async function deleteUserHandler(data: { userId: string }) {
  const admin = await requirePlatformAdmin()

  if (data.userId === admin.id) throw new Error('CANNOT_DELETE_SELF')

  const target = await db.user.findUnique({
    where: { id: data.userId },
    select: {
      id: true,
      name: true,
      email: true,
      isPlatformAdmin: true,
      deletedAt: true,
      organization: { select: { id: true, deletedAt: true } },
    },
  })
  if (!target) throw new Error('USER_NOT_FOUND')
  if (target.deletedAt) return { success: true }
  if (target.isPlatformAdmin) throw new Error('CANNOT_DELETE_ADMIN')
  if (target.organization && !target.organization.deletedAt) {
    throw new Error('CANNOT_DELETE_ORGANIZER')
  }

  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: { deletedAt: new Date() },
    }),
    // Actieve sessies onmiddellijk ongeldig maken; `deletedAt` alleen laat
    // een bestaande sessiecookie in leven tot de volgende controle.
    db.session.deleteMany({ where: { userId: target.id } }),
  ])

  await writeAuditLog({
    actorId: admin.id,
    action: 'UserDeleted',
    targetType: 'User',
    targetId: target.id,
    targetLabel: `${target.name} (${target.email})`,
  })

  return { success: true }
}

/** Rol is afgeleid, geen kolom — zie de toelichting bovenaan dit bestand. */
export function deriveUserRole(user: {
  isPlatformAdmin: boolean
  organization: { id: string } | null
}): AdminUserRole {
  if (user.isPlatformAdmin) return 'platformAdmin'
  return user.organization ? 'organizer' : 'customer'
}
