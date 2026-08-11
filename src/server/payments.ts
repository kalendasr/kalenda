import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

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
import { allowedSourceStates, nextState } from '#/lib/payment-transitions.ts'
import { effectiveOrderStatus } from '#/lib/order-status.ts'
import { enforceRateLimit } from '#/lib/rate-limit.server.ts'
import { generateTicketNumber } from '#/lib/ticket-number.ts'
import { buildPaymentRequestMessage } from '#/lib/payment-request-message.ts'
import { buildTicketShareMessage } from '#/lib/ticket-share-message.ts'
import { waLink } from '#/lib/whatsapp.ts'
import { getServerEnv } from '#/lib/env.server.ts'
import { sendPaymentRejectedEmail } from '#/lib/emails.server.ts'
import { sendTicketEmailForOrder } from '#/server/tickets.server.ts'
import { notify } from '#/server/notifications.server.ts'

/**
 * Betalingen voor de organisator (Fase 5 + Fase 6 + Fase 9).
 *
 * Owner-geguarde mutaties (`sendPaymentRequest`/`approve`/`reject`/
 * `getProofSignedUrl`) lopen via `requireOwnedEvent`; het indienen van een
 * betaalbewijs is publiek (zelfbediening door de klant, BR-603). Het platform
 * verwerkt geen geld (BR-600) — het bevestigt alleen de workflow.
 *
 * Bij goedkeuren (Fase 6) worden direct de tickets aangemaakt zodra de
 * betaling is geverifieerd (BR-604) en gaat de order naar `Paid`. Pas zodra de
 * tickets daadwerkelijk zijn verstuurd, wordt de order `Completed`
 * (`tickets.server.ts`) — zo betekent "Afgerond" ook echt "tickets geleverd",
 * en blijft een mislukte ticketmail zichtbaar in plaats van verborgen.
 */

/** Organisator verstuurt het betaalverzoek via WhatsApp (BR-602). */
export const sendPaymentRequest = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.uuid() }))
  .handler(async ({ data }): Promise<{ whatsappUrl: string | null }> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        payment: true,
        customer: { select: { firstName: true, phone: true } },
        event: {
          select: {
            title: true,
            organization: {
              select: { phone: true, paymentSettings: true },
            },
          },
        },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    if (order.paymentMethod !== 'WhatsApp') {
      throw new Error(
        'Een betaalverzoek is alleen nodig bij WhatsApp-betaling.',
      )
    }
    const now = new Date()
    if (effectiveOrderStatus(order, now) === 'Expired') {
      throw new Error('De betaaltermijn van deze bestelling is verstreken.')
    }
    if (!order.payment) throw new Error('PAYMENT_NOT_FOUND')
    if (!nextState(order.payment.state, 'request')) {
      throw new Error('Er is al een betaalverzoek verstuurd.')
    }

    await db.payment.update({
      where: { id: order.payment.id },
      data: { state: 'Requested', requestedAt: now, requestedBy: user.id },
    })

    // Klant krijgt een push zodra het verzoek onderweg is (geen try/catch
    // nodig: notify() gooit nooit).
    await notify(
      'payment.requested',
      { kind: 'customer', customerId: order.customerId },
      { orderNumber: order.orderNumber, eventTitle: order.event.title },
    )

    const orderUrl = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
    const message = buildPaymentRequestMessage({
      customerFirstName: order.customer.firstName,
      eventTitle: order.event.title,
      orderNumber: order.orderNumber,
      totalCents: order.totalCents,
      paymentApp: order.paymentApp,
      orderUrl,
      expiresAt: order.expiresAt,
    })
    // Organisator stuurt zelf het bericht in het geopende gesprek; het
    // platform verwerkt geen geld en heeft geen WhatsApp Business API (BR-600).
    const phone =
      order.event.organization.paymentSettings?.whatsappPhone ??
      order.event.organization.phone
    const whatsappUrl = waLink(phone, message)

    return { whatsappUrl }
  })

/** Wat de organisator direct na het bevestigen van een betaling te zien krijgt. */
export type ApprovePaymentResult = {
  orderId: string
  orderNumber: string
  customerFirstName: string
  ticketCount: number
  email: { to: string; sentAt: Date | null }
  push: { delivered: number; devices: number }
  whatsappUrl: string | null
}

/** Zet een order + bijbehorende Payment in de Betaald-toestand (BR-602/603/604). */
export const approvePayment = createServerFn({ method: 'POST' })
  .validator(approvePaymentSchema)
  .handler(async ({ data }): Promise<ApprovePaymentResult> => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        payment: true,
        items: { select: { id: true, quantity: true } },
        customer: { select: { firstName: true, phone: true, email: true } },
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
    if (effectiveOrderStatus(order, now) === 'Expired') {
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

    // Conditionele update: de where-voorwaarde op `state` is de echte
    // gelijktijdigheidsgrens (zelfde patroon als `resolveScan`). Zonder dit
    // kunnen twee gelijktijdige goedkeuringen allebei de vroege `nextState`-
    // check hierboven passeren (die alleen een vooraf-gelezen snapshot ziet)
    // en dus allebei een volledige ticketset aanmaken voor dezelfde order.
    const paymentId = order.payment.id
    await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, state: { in: allowedSourceStates('approve') } },
        data: { state: 'Verified', verifiedBy: user.id, verifiedAt: now },
      })
      if (updated.count !== 1) {
        throw new Error('Deze betaling kan niet worden goedgekeurd.')
      }

      // De order is nu betaald (BR-505); pas als de ticketmail daadwerkelijk
      // verstuurd is (tickets.server.ts) wordt hij Completed. Zo blijft
      // zichtbaar wanneer de betaling wél binnen is maar de levering nog niet.
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'Paid',
          paymentStatus: 'Verified',
          notes: order.notes,
        },
      })

      for (const ticket of ticketCreates) {
        await tx.ticket.create({ data: ticket })
      }
    })

    // Ticketmail met PDF + pushmelding na commit; een fout hier mag de
    // uitgifte niet ongedaan maken (zelfde patroon als de checkout-bevestiging).
    // Bij succes zet dit de order pas op Completed (tickets.server.ts).
    let emailSentAt: Date | null = null
    try {
      const result = await sendTicketEmailForOrder(order.id, 'Email')
      emailSentAt = result.sentAt
    } catch {
      // Stil: de tickets staan (Paid); de organisator ziet in de
      // bevestigingspopup "Mailen is niet gelukt" en kan het opnieuw
      // proberen. De klant kan ze ook op de orderpagina zien.
    }
    // notify() gooit nooit (zie notifications.server.ts) — geen try/catch nodig.
    const push = await notify(
      'tickets.issued',
      { kind: 'customer', customerId: order.customerId },
      {
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        ticketCount: ticketCreates.length,
      },
    )

    // Zelfde WhatsApp-link als de losse "Delen via WhatsApp"-knop, hier
    // meteen aangeboden zodat de organisator niet terug hoeft naar het
    // orderdetail om de tickets ook te appen (BR-600: platform verstuurt
    // zelf niets, het opent alleen het gesprek).
    const orderUrl = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
    const shareMessage = buildTicketShareMessage({
      customerFirstName: order.customer.firstName,
      eventTitle: order.event.title,
      orderUrl,
    })

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerFirstName: order.customer.firstName,
      ticketCount: ticketCreates.length,
      email: { to: order.customer.email, sentAt: emailSentAt },
      push: { delivered: push.delivered, devices: push.devices },
      whatsappUrl: waLink(order.customer.phone, shareMessage),
    }
  })

/** Keurt een ingediende betaling af (BR-603/607). De klant kan opnieuw indienen (BR-605). */
export const rejectPayment = createServerFn({ method: 'POST' })
  .validator(rejectPaymentSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        payment: true,
        customer: { select: { email: true } },
        event: { select: { title: true } },
      },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    const now = new Date()
    if (order.orderStatus === 'Paid' || order.orderStatus === 'Completed') {
      throw new Error('Deze bestelling is al betaald.')
    }
    if (effectiveOrderStatus(order, now) === 'Expired') {
      throw new Error('De betaaltermijn van deze bestelling is verstreken.')
    }
    if (!order.payment) throw new Error('PAYMENT_NOT_FOUND')
    if (!nextState(order.payment.state, 'reject')) {
      throw new Error('Deze betaling kan niet worden afgekeurd.')
    }

    // Zelfde conditionele-update-patroon als `approvePayment`: de where op
    // `state` is de echte gelijktijdigheidsgrens.
    const paymentId = order.payment.id
    await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, state: { in: allowedSourceStates('reject') } },
        data: { state: 'Rejected', notes: data.notes ?? null },
      })
      if (updated.count !== 1) {
        throw new Error('Deze betaling kan niet worden afgekeurd.')
      }

      // Bij afkeuring keert de order terug naar "wacht op controle" en kan de
      // klant een nieuw bewijs indienen (BR-605).
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: 'AwaitingReview', paymentStatus: 'Rejected' },
      })
    })

    // Klant krijgt automatisch een melding (BR-606/903) — voorheen ontbrak dit
    // volledig en zag de klant een afkeuring pas bij een toevallig bezoek.
    const orderUrl = `${getServerEnv().BETTER_AUTH_URL}/bestelling/${order.orderNumber}`
    try {
      await sendPaymentRejectedEmail({
        to: order.customer.email,
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        reason: data.notes ?? null,
        url: orderUrl,
      })
    } catch {
      // Stil: de afkeuring staat; de klant ziet hem ook op de orderpagina.
    }
    await notify(
      'payment.rejected',
      { kind: 'customer', customerId: order.customerId },
      { orderNumber: order.orderNumber, eventTitle: order.event.title },
    )

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
    // Publiek endpoint met het ordernummer als enige geheim — een rem tegen
    // enumeratie en tegen misbruik van de uploadopslag (zie rate-limit.server.ts).
    enforceRateLimit('submitProofOfPayment', 10)

    const { file, extension } = await validateImageFile(data.file)

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
    if (effectiveOrderStatus(order, now) === 'Expired') {
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

    // Zelfde conditionele-update-patroon als `approvePayment`: de where op
    // `state` is de echte gelijktijdigheidsgrens.
    const paymentId = order.payment.id
    await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, state: { in: allowedSourceStates('submit') } },
        data: {
          state: 'Submitted',
          proofKey: key,
          reference: data.reference ?? null,
        },
      })
      if (updated.count !== 1) {
        throw new Error(
          'Het betaalbewijs is al ontvangen of de betaling is al verwerkt.',
        )
      }

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: 'AwaitingReview', paymentStatus: 'Pending' },
      })
    })

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
