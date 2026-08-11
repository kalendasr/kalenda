import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import {
  containsInsensitive,
  paginateQuery,
} from '#/server/admin/shared.server.ts'
import { listPaymentsInputSchema } from '#/lib/validation/admin.ts'
import type { ListPaymentsInput } from '#/lib/validation/admin.ts'
import type { Prisma } from '#/generated/prisma/client.ts'
import type { PaymentState } from '#/generated/prisma/enums.ts'

/**
 * Betalingsoverzicht voor de platformbeheerder (Fase 12) — strikt lezend.
 *
 * Het platform is geen betaaldienst en ontvangt nooit geld (CLAUDE.md §5,
 * BR-600). De organisator beoordeelt of een betaling geldig is (BR-607). Er
 * bestaat hier daarom bewust géén server function waarmee een beheerder een
 * betaalstatus kan wijzigen: dat zou de enige controle in de keten
 * kortsluiten en tickets kunnen laten uitgeven zonder dat iemand het geld
 * gezien heeft (BR-604).
 *
 * Terugbetalingen bestaan niet in dit datamodel en worden hier dus ook niet
 * gesimuleerd.
 */

function buildPaymentWhere(input: ListPaymentsInput): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { order: { deletedAt: null } }

  if (input.state !== 'all') where.state = input.state
  if (input.method !== 'all') where.method = input.method

  const search = input.search?.trim()
  if (search && search.length >= 2) {
    where.OR = [
      { reference: containsInsensitive(search) },
      { order: { orderNumber: search.toUpperCase() } },
      { order: { customer: { email: containsInsensitive(search) } } },
    ]
  }

  return where
}

export const listPayments = createServerFn({ method: 'GET' })
  .validator(listPaymentsInputSchema)
  .handler(async ({ data }) => {
    await requirePlatformAdmin()

    const where = buildPaymentWhere(data)
    const orderBy = {
      [data.sort]: data.direction,
    } as Prisma.PaymentOrderByWithRelationInput

    const result = await paginateQuery(data, {
      findMany: ({ skip, take }) =>
        db.payment.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            method: true,
            state: true,
            reference: true,
            requestedAt: true,
            verifiedAt: true,
            verifiedBy: true,
            // De afwijsreden die de organisator noteert (BR-607).
            notes: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderStatus: true,
                paymentStatus: true,
                currency: true,
                totalCents: true,
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
              },
            },
          },
        }),
      count: () => db.payment.count({ where }),
    })

    // `verifiedBy` is in het schema een losse string (geen relatie). We
    // vertalen hem hier één keer naar een naam in plaats van per rij een
    // query te doen (N+1).
    const verifierIds = [
      ...new Set(
        result.rows
          .map((row) => row.verifiedBy)
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    const verifiers = verifierIds.length
      ? await db.user.findMany({
          where: { id: { in: verifierIds } },
          select: { id: true, name: true },
        })
      : []
    const verifierNames = new Map(verifiers.map((user) => [user.id, user.name]))

    return {
      ...result,
      rows: result.rows.map((row) => ({
        ...row,
        verifiedByName: row.verifiedBy
          ? (verifierNames.get(row.verifiedBy) ?? null)
          : null,
      })),
    }
  })

/** Verdeling over betaaltoestanden, voor de statistiekbalk boven de lijst. */
export const getPaymentStateSummary = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()

    const groups = await db.payment.groupBy({
      by: ['state'],
      where: { order: { deletedAt: null } },
      _count: { _all: true },
    })

    const summary: Partial<Record<PaymentState, number>> = {}
    for (const group of groups) summary[group.state] = group._count._all
    return summary
  },
)
