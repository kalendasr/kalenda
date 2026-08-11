import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { allowedSourceStates, nextState } from '#/lib/payment-transitions.ts'
import {
  effectiveOrderStatus,
  hasOpenCancellationRequest,
} from '#/lib/order-status.ts'
import { enforceRateLimit } from '#/lib/rate-limit.server.ts'
import { notify } from '#/server/notifications.server.ts'

/**
 * Orders voor de organisator (owner-geguard): het overzicht van binnenkomende
 * bestellingen per event, het annuleren daarvan, en het afhandelen van
 * annuleringsverzoeken van klanten (BR-509). Bevestigen en afkeuren van
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
 * Annuleert een bestelling (BR-508). Tot nu toe was `Cancelled` een status die
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
          // Stond er een verzoek van de klant open, dan is dat hiermee
          // beantwoord (BR-509).
          ...(hasOpenCancellationRequest(order)
            ? { cancellationHandledAt: new Date() }
            : {}),
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

/**
 * Klant vraagt om annulering van zijn bestelling (BR-509).
 *
 * Publiek, net als `submitProofOfPayment`: het bestelnummer is het geheim, en
 * de bestelpagina is bewust deelbaar. Het platform beslist niets — het brengt
 * het verzoek bij de organisator, die het toekent of afwijst (BR-607).
 *
 * Een reden is verplicht: zonder reden kan de organisator er niets mee, en de
 * pushmelding die hij krijgt bestaat juist uit die reden.
 */
export const requestCancellation = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      orderNumber: z.string().min(1),
      reason: z.string().trim().min(5).max(500),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // Publiek endpoint met het bestelnummer als enige geheim — zelfde rem als
    // bij de andere publieke orderacties (zie rate-limit.server.ts).
    enforceRateLimit('requestCancellation', 5)

    const order = await db.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: {
        event: { select: { organization: { select: { ownerId: true } } } },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    if (order.orderStatus === 'Cancelled') {
      throw new Error('Deze bestelling is al geannuleerd.')
    }
    if (effectiveOrderStatus(order) === 'Expired') {
      throw new Error(
        'Deze bestelling is verlopen; je hoeft hem niet te annuleren.',
      )
    }
    if (hasOpenCancellationRequest(order)) {
      throw new Error('Je verzoek staat al bij de organisator.')
    }

    // De where-voorwaarde is de gelijktijdigheidsgrens: twee keer snel klikken
    // mag niet tot twee verzoeken (en twee pushmeldingen) leiden.
    const updated = await db.order.updateMany({
      where: {
        id: order.id,
        orderStatus: { not: 'Cancelled' },
        OR: [
          { cancellationRequestedAt: null },
          { cancellationHandledAt: { not: null } },
        ],
      },
      data: {
        cancellationRequestedAt: new Date(),
        cancellationReason: data.reason,
        cancellationHandledAt: null,
      },
    })
    if (updated.count !== 1) {
      throw new Error('Je verzoek staat al bij de organisator.')
    }

    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    await notify(
      'cancellation.requested',
      { kind: 'user', userId: order.event.organization.ownerId },
      {
        eventId: order.eventId,
        orderNumber: order.orderNumber,
        reason: data.reason,
      },
    )

    return { ok: true }
  })

/**
 * Organisator wijst een annuleringsverzoek af (BR-509/607). De bestelling
 * blijft gewoon staan; alleen het verzoek is daarmee beantwoord.
 */
export const declineCancellation = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { event: { select: { title: true } } },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    if (!hasOpenCancellationRequest(order)) {
      throw new Error('Er staat geen annuleringsverzoek open.')
    }

    const updated = await db.order.updateMany({
      where: { id: order.id, cancellationHandledAt: null },
      data: { cancellationHandledAt: new Date() },
    })
    if (updated.count !== 1) {
      throw new Error('Dit verzoek is al afgehandeld.')
    }

    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    await notify(
      'cancellation.declined',
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
