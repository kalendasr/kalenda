import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import type { ListOrdersInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Bestellingenoverzicht voor de platformbeheerder (Fase 12) — uitsluitend
 * lezend.
 *
 * Orderstatus en betaalstatus zijn twee verschillende dingen en worden hier
 * ook nooit samengevoegd: `orderStatus` beschrijft waar de bestelling in het
 * traject staat (BR-505), `paymentStatus` beschrijft het oordeel over de
 * betaling (BR-607). Een bestelling kan `AwaitingReview` zijn met
 * `paymentStatus = Pending`, of `Cancelled` met `Verified`. De UI toont ze in
 * twee aparte kolommen.
 *
 * Beoordelen van betalingen blijft bij de organisator (BR-607); daar zit hier
 * dus geen mutatie voor.
 */

function buildOrderWhere(input: ListOrdersInput): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { deletedAt: null }

  if (input.orderStatus !== 'all') where.orderStatus = input.orderStatus
  if (input.paymentStatus !== 'all') where.paymentStatus = input.paymentStatus
  if (input.eventId) where.eventId = input.eventId
  if (input.organizationId) {
    where.event = { organizationId: input.organizationId }
  }

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      // Ordernummer is uniek en geïndexeerd: exact opzoeken, geen scan.
      { orderNumber: search.toUpperCase() },
      { customer: { email: containsInsensitive(search) } },
      { customer: { lastName: containsInsensitive(search) } },
      { event: { title: containsInsensitive(search) } },
    ]
  }

  return where
}

export async function listOrdersHandler(data: ListOrdersInput) {
  await requirePlatformAdmin()

  const where = buildOrderWhere(data)
  const orderBy = {
    [data.sort]: data.direction,
  } as Prisma.OrderOrderByWithRelationInput

  return paginateQuery(data, {
    findMany: ({ skip, take }) =>
      db.order.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          paymentStatus: true,
          paymentMethod: true,
          currency: true,
          subtotalCents: true,
          serviceFeeCents: true,
          discountCents: true,
          totalCents: true,
          expiresAt: true,
          createdAt: true,
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
          event: {
            select: {
              id: true,
              title: true,
              organization: { select: { id: true, name: true } },
            },
          },
          _count: { select: { items: true } },
        },
      }),
    count: () => db.order.count({ where }),
  })
}

export async function getOrderDetailHandler(data: { orderNumber: string }) {
  await requirePlatformAdmin()

  const order = await db.order.findUnique({
    where: { orderNumber: data.orderNumber.toUpperCase() },
    select: {
      id: true,
      orderNumber: true,
      orderStatus: true,
      paymentStatus: true,
      paymentMethod: true,
      paymentApp: true,
      currency: true,
      subtotalCents: true,
      serviceFeeCents: true,
      discountCents: true,
      totalCents: true,
      notes: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      user: { select: { id: true, name: true, email: true } },
      event: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          organization: { select: { id: true, name: true } },
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceCents: true,
          totalPriceCents: true,
          ticketType: { select: { id: true, name: true } },
          tickets: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              issuedAt: true,
              sentAt: true,
              sentVia: true,
              checkedInAt: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          method: true,
          state: true,
          reference: true,
          requestedAt: true,
          verifiedAt: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          // `proofKey` is bewust niet geselecteerd: het betaalbewijs is
          // privédata van de klant en de organisator beoordeelt het.
        },
      },
    },
  })

  if (!order) throw new Error('ORDER_NOT_FOUND')

  return order
}
