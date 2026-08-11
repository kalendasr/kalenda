import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { allowedSourceStates, nextState } from '#/lib/payment-transitions.ts'
import { notify } from '#/server/notifications.server.ts'

/**
 * Orders voor de organisator (owner-geguard): het overzicht van binnenkomende
 * bestellingen per event, en het annuleren daarvan. Bevestigen en afkeuren van
 * betalingen leeft in `payments.ts` — dat hoort bij het betaaldomein.
 */
export const listEventOrders = createServerFn({ method: 'GET' })
  .validator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireOwnedEvent(user.id, data.eventId)

    return db.order.findMany({
      where: { eventId: data.eventId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        items: {
          select: {
            quantity: true,
            ticketType: { select: { name: true } },
            tickets: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
                sentAt: true,
                sentVia: true,
                checkedInAt: true,
              },
            },
          },
        },
        payment: {
          select: {
            state: true,
            proofKey: true,
            requestedAt: true,
            verifiedAt: true,
            reference: true,
            notes: true,
          },
        },
      },
    })
  })

/**
 * Annuleert een bestelling (BR-505). Tot nu toe was `Cancelled` een status die
 * de businessregels wel kennen maar die nergens bereikbaar was: een bestelling
 * die nooit betaald werd, bleef staan tot hij verliep. Een organisator die een
 * dubbele of foutieve bestelling ziet, kan hem nu meteen opruimen — dat geeft
 * de gereserveerde plaatsen ook direct terug in de verkoop (BR-507).
 *
 * Alleen zolang er nog geen tickets zijn: na `Paid` zijn de tickets uitgegeven
 * (BR-604) en zou annuleren betekenen dat we geldige QR-codes moeten
 * intrekken. Dat is terugbetalingsgebied en hoort niet in de MVP.
 */
export const cancelOrder = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      orderId: z.uuid(),
      reason: z
        .string()
        .trim()
        .transform((value) => (value === '' ? undefined : value))
        .optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { payment: true, event: { select: { title: true } } },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    if (order.orderStatus === 'Paid' || order.orderStatus === 'Completed') {
      throw new Error(
        'Deze bestelling is betaald en heeft tickets — annuleren kan niet meer.',
      )
    }
    if (order.orderStatus === 'Cancelled') {
      throw new Error('Deze bestelling is al geannuleerd.')
    }

    // Conditionele update als gelijktijdigheidsgrens, net als in
    // `approvePayment`: annuleren mag de bestelling niet wegkapen onder een
    // goedkeuring die op hetzelfde moment binnenkomt.
    await db.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          orderStatus: { in: ['PendingPayment', 'AwaitingReview'] },
        },
        data: {
          orderStatus: 'Cancelled',
          notes: data.reason ?? order.notes,
        },
      })
      if (updated.count !== 1) {
        throw new Error('Deze bestelling kan niet meer geannuleerd worden.')
      }

      if (order.payment && nextState(order.payment.state, 'cancel')) {
        await tx.payment.updateMany({
          where: {
            id: order.payment.id,
            state: { in: allowedSourceStates('cancel') },
          },
          data: { state: 'Cancelled' },
        })
      }
    })

    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    await notify(
      'order.cancelled',
      { kind: 'customer', customerId: order.customerId },
      { orderNumber: order.orderNumber, eventTitle: order.event.title },
    )

    return { ok: true }
  })

// --- Kopersectie: bestellingen van de ingelogde koper (eigen "Orders"-domein,
// hierboven owner-geguard voor organisatoren). ---

/** Bestellingen van de ingelogde koper, voor "Mijn tickets". */
export const listMyOrders = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()

    return db.order.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: { title: true, slug: true, startsAt: true, venue: true },
        },
        items: {
          select: {
            quantity: true,
            ticketType: { select: { name: true } },
          },
        },
      },
    })
  },
)
