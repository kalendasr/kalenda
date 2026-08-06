import { createServerFn } from '@tanstack/react-start'

import { db } from '#/lib/db.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { getSignedDownloadUrl, uploadObject } from '#/lib/storage.server.ts'
import { validateImageFile } from '#/lib/upload-file.server.ts'
import {
  approvePaymentSchema,
  parseProofUpload,
  rejectPaymentSchema,
} from '#/lib/validation/payment.ts'
import { nextState } from '#/lib/payment-transitions.ts'
import { generateTicketNumber } from '#/lib/ticket-number.ts'
import { sendTicketEmailForOrder } from '#/server/tickets.server.ts'
import { notify } from '#/server/notifications.server.ts'

/**
 * Betalingen voor de organisator (Fase 5 + Fase 6).
 *
 * Owner-geguarde mutaties (`approve`/`reject`/`getProofSignedUrl`) lopen via
 * `requireOwnedEvent`; het indienen van een betaalbewijs is publiek
 * (zelfbediening door de klant, BR-603). Het platform verwerkt geen geld
 * (BR-600) — het bevestigt alleen de workflow.
 *
 * Bij goedkeuren (Fase 6) worden direct de tickets aangemaakt en per e-mail
 * verstuurd zodra de betaling is geverifieerd (BR-604). De order wordt daarna
 * `Completed`.
 */

/** Zet een order + bijbehorende Payment in de Betaald-toestand (BR-602/603/604). */
export const approvePayment = createServerFn({ method: 'POST' })
  .validator(approvePaymentSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        payment: true,
        items: { select: { id: true, quantity: true } },
        event: { select: { title: true } },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    // Alleen mogelijk terwijl de betaaltermijn loopt en nog niet is afgerond.
    const now = new Date()
    if (order.orderStatus === 'Paid' || order.orderStatus === 'Completed') {
      throw new Error('Deze bestelling is al betaald.')
    }
    if (order.orderStatus !== 'Cancelled' && order.expiresAt < now) {
      throw new Error('De betaaltermijn van deze bestelling is verstreken.')
    }
    if (!order.payment) throw new Error('PAYMENT_NOT_FOUND')
    if (!nextState(order.payment.state, 'approve')) {
      throw new Error('Deze betaling kan niet worden goedgekeurd.')
    }

    // Eén ticket per "stoel": elke eenheid in een orderregel krijgt een eigen,
    // uniek ticketnummer (BR-700/701).
    const ticketCreates = order.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        orderItemId: item.id,
        ticketNumber: generateTicketNumber(),
      })),
    )

    await db.$transaction([
      db.payment.update({
        where: { id: order.payment.id },
        data: { state: 'Verified', verifiedBy: user.id, verifiedAt: now },
      }),
      // Zodra tickets bestaan is de order afgerond (Completed).
      db.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'Completed',
          paymentStatus: 'Verified',
          notes: order.notes,
        },
      }),
      ...ticketCreates.map((ticket) =>
        db.ticket.create({
          data: ticket,
        }),
      ),
    ])

    // Ticketmail met PDF + pushmelding na commit; een fout hier mag de
    // uitgifte niet ongedaan maken (zelfde patroon als de checkout-bevestiging).
    try {
      await sendTicketEmailForOrder(order.id)
    } catch {
      // Stil: de tickets staan; de klant kan ze ook op de orderpagina zien.
    }
    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    await notify(
      'tickets.issued',
      { kind: 'customer', customerId: order.customerId },
      {
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        ticketCount: ticketCreates.length,
      },
    )

    return { ok: true }
  })

/** Keurt een ingediende betaling af (BR-603/607). De klant kan opnieuw indienen (BR-605). */
export const rejectPayment = createServerFn({ method: 'POST' })
  .validator(rejectPaymentSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { payment: true },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    const now = new Date()
    if (order.orderStatus === 'Paid' || order.orderStatus === 'Completed') {
      throw new Error('Deze bestelling is al betaald.')
    }
    if (order.orderStatus !== 'Cancelled' && order.expiresAt < now) {
      throw new Error('De betaaltermijn van deze bestelling is verstreken.')
    }
    if (!order.payment) throw new Error('PAYMENT_NOT_FOUND')
    if (!nextState(order.payment.state, 'reject')) {
      throw new Error('Deze betaling kan niet worden afgekeurd.')
    }

    await db.$transaction([
      db.payment.update({
        where: { id: order.payment.id },
        data: { state: 'Rejected', notes: data.notes ?? null },
      }),
      // Bij afkeuring keert de order terug naar "wacht op controle" en kan de
      // klant een nieuw bewijs indienen (BR-605).
      db.order.update({
        where: { id: order.id },
        data: { orderStatus: 'AwaitingReview', paymentStatus: 'Rejected' },
      }),
    ])

    return { ok: true }
  })

/** Geeft een beveiligde, tijdelijke download-URL voor een betaalbewijs (organisator). */
export const getProofSignedUrl = createServerFn({ method: 'GET' })
  .validator(approvePaymentSchema)
  .handler(async ({ data }): Promise<{ url: string } | null> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { payment: true },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')
    await requireOwnedEvent(user.id, order.eventId)

    const key = order.payment?.proofKey
    if (!key) return null

    // Korte, beveiligde download-URL (niet publiek) — zie storage.server.ts.
    const url = await getSignedDownloadUrl(key)
    return { url }
  })

/**
 * Klant dient een bankbetaalbewijs in (BR-603). Publiek (geen login) — de
 * eigenaar van de order wordt via het unieke bestelnummer geïdentificeerd.
 */
export const submitProofOfPayment = createServerFn({ method: 'POST' })
  .validator(parseProofUpload)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { file, extension } = validateImageFile(data.file)

    // Publieke lookup op bestelnummer (zoals getOrderByNumber, maar binnen tx).
    const order = await db.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: {
        payment: true,
        customer: { select: { firstName: true, lastName: true } },
        event: {
          select: { organization: { select: { ownerId: true } } },
        },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (order.paymentMethod !== 'BankTransfer') {
      throw new Error('Voor deze bestelling is geen betaalbewijs nodig.')
    }

    const now = new Date()
    if (order.orderStatus === 'Paid' || order.orderStatus === 'Completed') {
      throw new Error('Deze bestelling is al betaald.')
    }
    if (order.expiresAt < now) {
      throw new Error('De betaaltermijn van deze bestelling is verstreken.')
    }
    if (!order.payment) throw new Error('PAYMENT_NOT_FOUND')
    if (!nextState(order.payment.state, 'submit')) {
      throw new Error(
        'Het betaalbewijs is al ontvangen of de betaling is al verwerkt.',
      )
    }

    // Privaat bewaren; organisatoren zien het alleen via een korte URL.
    const key = `payments/${order.id}/proof-${crypto.randomUUID()}.${extension}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    await uploadObject({ key, body: bytes, contentType: file.type })

    await db.$transaction([
      db.payment.update({
        where: { id: order.payment.id },
        data: {
          state: 'Submitted',
          proofKey: key,
          reference: data.reference ?? null,
        },
      }),
      db.order.update({
        where: { id: order.id },
        data: { orderStatus: 'AwaitingReview', paymentStatus: 'Pending' },
      }),
    ])

    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    await notify(
      'payment.submitted',
      { kind: 'user', userId: order.event.organization.ownerId },
      {
        eventId: order.eventId,
        orderNumber: order.orderNumber,
        customerName:
          `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      },
    )

    return { ok: true }
  })
