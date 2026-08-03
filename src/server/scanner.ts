import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { resolveScanResult } from '#/lib/scan-result.ts'
import { parseTicketNumberFromQr } from '#/lib/ticket-qr.ts'
import type { CheckInResult } from '#/lib/scan-result.ts'

/**
 * Scanner / check-in voor de organisator (Fase 7, BUSINESS_RULES BR-800..804).
 *
 * De autoritatieve concurrentiebeslissing ligt in de databaselaag: `resolveScan`
 * doet een conditionele `updateMany` op `status IN (Issued, Sent)` binnen een
 * transactie, zodat twee gelijktijdige scans van hetzelfde ticket op precies
 * één `Valid` uitkomen. Iedere scan — ook mislukte — wordt opgeslagen (BR-800).
 * Alle functies zijn owner-geguard via `requireOwnedEvent`.
 *
 * `resolveScanResult` (src/lib/scan-result.ts) is de Enige Bron van Waarheid
 * voor de mapping ticketstaat → resultaat; hier wordt die alleen op de gelezen
 * staat toegepast voor de terugkoppeling aan de UI.
 */

const resolveScanSchema = z.object({
  eventId: z.uuid(),
  // De QR-payload (resolvende URL) of een kaal ticketnummer.
  payload: z.string().trim().min(1),
})

/** Wat de scanner terugkrijgt na een scan of handmatige check-in. */
type ScanTicketView = {
  id: string
  ticketNumber: string
  status: string
  holderName: string
  ticketTypeName: string
  checkedInAt: Date | null
}

export type ResolveScanResponse = {
  result: CheckInResult
  ticket: ScanTicketView | null
}

/** Lost een scan op atomair: lookup → check-in → CheckIn-rij vastleggen. */
export const resolveScan = createServerFn({ method: 'POST' })
  .validator(resolveScanSchema)
  .handler(async ({ data }): Promise<ResolveScanResponse> => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const ticketNumber = parseTicketNumberFromQr(data.payload)
    // Onleesbare payload → behandelen als een niet-gevonden scan (BR-804).
    if (!ticketNumber) {
      await db.checkIn.create({
        data: {
          eventId: data.eventId,
          ticketNumber: data.payload.slice(0, 255),
          scannedById: user.id,
          result: 'NotFound',
        },
      })
      return { result: 'NotFound', ticket: null }
    }

    return db.$transaction(async (tx) => {
      // Lookup, begrensd op dit event (via orderItem.order.eventId), zodat een
      // ticket van een ander evenement nooit wordt ingecheckt.
      const ticket = await tx.ticket.findFirst({
        where: {
          ticketNumber,
          orderItem: { order: { eventId: data.eventId, deletedAt: null } },
        },
        include: {
          orderItem: {
            select: {
              ticketType: { select: { name: true } },
              order: {
                select: {
                  customer: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      })

      // Niet gevonden (of verkeerd event) → NotFound (BR-804).
      if (!ticket) {
        await tx.checkIn.create({
          data: {
            eventId: data.eventId,
            ticketNumber,
            scannedById: user.id,
            result: 'NotFound',
          },
        })
        return { result: 'NotFound' as const, ticket: null }
      }

      const holderName =
        `${ticket.orderItem.order.customer.firstName} ${ticket.orderItem.order.customer.lastName}`.trim()

      // Conditionele check-in: alleen als het ticket nog Issued/Sent is.
      // `count === 1` betekent dat wíj de winnende scan waren (BR-801).
      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, status: { in: ['Issued', 'Sent'] } },
        data: {
          status: 'CheckedIn',
          checkedInAt: new Date(),
          checkedInBy: user.id,
        },
      })

      let result: CheckInResult
      if (updated.count === 1) {
        result = 'Valid'
      } else {
        result = resolveScanResult({ exists: true, status: ticket.status })
      }

      // Iedere scan wordt opgeslagen (BR-800).
      await tx.checkIn.create({
        data: {
          eventId: data.eventId,
          ticketId: ticket.id,
          ticketNumber,
          scannedById: user.id,
          result,
        },
      })

      const view: ScanTicketView = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: result === 'Valid' ? 'CheckedIn' : ticket.status,
        holderName,
        ticketTypeName: ticket.orderItem.ticketType.name,
        checkedInAt: result === 'Valid' ? new Date() : ticket.checkedInAt,
      }

      return { result, ticket: view }
    })
  })

const listCheckInsSchema = z.object({ eventId: z.uuid() })

/** Scangeschiedenis voor een event (BR-800). */
export const listEventCheckIns = createServerFn({ method: 'GET' })
  .validator(listCheckInsSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.checkIn.findMany({
      where: { eventId: data.eventId },
      orderBy: { scannedAt: 'desc' },
      take: 100,
      include: {
        scannedBy: { select: { firstName: true, lastName: true } },
        ticket: {
          select: {
            ticketNumber: true,
            orderItem: {
              select: {
                ticketType: { select: { name: true } },
                order: {
                  select: {
                    customer: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
  })

const listTicketsSchema = z.object({
  eventId: z.uuid(),
  query: z.string().trim().optional(),
})

/** Doorzoekbare ticketlijst voor handmatige check-in. */
export const listEventTickets = createServerFn({ method: 'GET' })
  .validator(listTicketsSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    const query = data.query?.trim()
    const where = query
      ? {
          orderItem: {
            order: {
              eventId: data.eventId,
              deletedAt: null,
              OR: [
                {
                  customer: {
                    firstName: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
                {
                  customer: {
                    lastName: { contains: query, mode: 'insensitive' as const },
                  },
                },
              ],
            },
          },
        }
      : {
          orderItem: {
            order: { eventId: data.eventId, deletedAt: null },
          },
        }

    return db.ticket.findMany({
      where,
      orderBy: { ticketNumber: 'asc' },
      take: 50,
      include: {
        orderItem: {
          select: {
            ticketType: { select: { name: true } },
            order: {
              select: {
                orderNumber: true,
                customer: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })
  })
