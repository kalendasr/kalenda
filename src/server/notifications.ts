import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/lib/db.server.ts'
import { getPushEnv } from '#/lib/env.server.ts'
import { requireOwnedEvent } from '#/lib/event-guard.server.ts'
import { describeDevice } from '#/lib/notifications/device.ts'
import { resolveEnabled } from '#/lib/notifications/preferences.ts'
import {
  NOTIFICATION_KEYS,
  NOTIFICATIONS,
  organizerToggleableDefinitions,
} from '#/lib/notifications/registry.ts'
import { sendPush } from '#/lib/push.server.ts'
import { requireUser } from '#/lib/session.server.ts'
import { notify } from '#/server/notifications.server.ts'

/**
 * Server functions voor pushmeldingen (Fase 4/5).
 *
 * De verzendkern staat in `notifications.server.ts`; dit bestand is de
 * UI-facing laag: abonnementen opslaan/verwijderen, voorkeuren beheren en een
 * testmelding sturen. Organisator-functies lopen via `requireUser()`; de
 * klant-functie is publiek en vertrouwt — net als het uploaden van een
 * betaalbewijs — op het ordernummer als sleutel.
 */

const subscriptionSchema = z.object({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
})

/** De publieke VAPID-sleutel die de browser nodig heeft om te abonneren. */
export const getPushPublicKey = createServerFn({ method: 'GET' }).handler(
  () => {
    return { publicKey: getPushEnv().VAPID_PUBLIC_KEY }
  },
)

/** Slaat het abonnement van een ingelogde organisator op (upsert op endpoint). */
export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator(subscriptionSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Een `endpoint` is uniek per browser-abonnement. Alleen her-koppelen als
    // hij nog vrij is óf al van deze gebruiker is — anders zou wie een
    // endpoint-string van iemand anders leert, diens abonnement kunnen
    // kapen (en zo hun meldingen kunnen stopzetten).
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: data.endpoint },
      select: { userId: true },
    })
    if (existing && existing.userId !== user.id) {
      throw new Error('FORBIDDEN')
    }

    await db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      // Eén uitzondering op "niet her-koppelen": een gedeeld apparaat kan
      // van eigenaar wisselen zolang het endpoint nog niemand toebehoorde.
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        userId: user.id,
        customerId: null,
        lastSeenAt: new Date(),
        failureCount: 0,
      },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        userId: user.id,
      },
    })

    return { ok: true }
  })

/**
 * Slaat het abonnement van de koper op, gekoppeld aan de klant achter een
 * ordernummer. Checkout vereist inloggen (`createOrder`), dus elke order
 * heeft een `userId` — de aanroeper moet de ingelogde eigenaar van die order
 * zijn. Zonder deze check zou het ordernummer (het enige "geheim" op de
 * deelbare orderlink) genoeg zijn om je permanent te abonneren op iemand
 * anders' betaal-/ticketmeldingen.
 */
export const saveCustomerPushSubscription = createServerFn({ method: 'POST' })
  .validator(subscriptionSchema.extend({ orderNumber: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { orderNumber: data.orderNumber },
      select: { customerId: true, userId: true },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (order.userId !== user.id) throw new Error('FORBIDDEN')

    await db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        customerId: order.customerId,
        userId: null,
        lastSeenAt: new Date(),
        failureCount: 0,
      },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        customerId: order.customerId,
      },
    })

    return { ok: true }
  })

/** De apparaten (abonnementen) van de ingelogde organisator, nieuwste eerst. */
export const listMyPushDevices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()

    const rows = await db.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        lastSeenAt: true,
        createdAt: true,
      },
    })

    return rows.map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      label: describeDevice(row.userAgent),
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
    }))
  },
)

/** Verwijdert één apparaat van de ingelogde organisator (eigendom in de where). */
export const deletePushDevice = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser()

    await db.pushSubscription.deleteMany({
      where: { id: data.id, userId: user.id },
    })

    return { ok: true }
  })

/**
 * De aan/uit-zetbare organisatortypen met hun huidige stand: de standaard uit de
 * registry, overschreven door wat de gebruiker heeft ingesteld.
 */
export const getMyNotificationPreferences = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await requireUser()

  const stored = await db.notificationPreference.findMany({
    where: { userId: user.id },
    select: { type: true, enabled: true },
  })

  return organizerToggleableDefinitions().map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    enabled: resolveEnabled(def, stored),
  }))
})

/** Zet één notificatietype aan of uit voor de ingelogde organisator. */
export const setNotificationPreference = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      type: z.enum(NOTIFICATION_KEYS as [string, ...Array<string>]),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()

    await db.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type: data.type } },
      update: { enabled: data.enabled },
      create: { userId: user.id, type: data.type, enabled: data.enabled },
    })

    return { ok: true }
  })

/** Stuurt een testmelding naar alle apparaten van de ingelogde organisator. */
export const sendTestPush = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireUser()

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: user.id },
    })
    if (subscriptions.length === 0) {
      throw new Error(
        'Er is nog geen apparaat gekoppeld. Zet meldingen eerst aan.',
      )
    }

    const payload = {
      title: 'Testmelding',
      body: 'Als je dit ziet, werken je meldingen. 🎉',
      url: '/organization/notifications',
      tag: 'test',
    }

    let delivered = 0
    const goneIds: Array<string> = []
    for (const sub of subscriptions) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      )
      if (result.ok) delivered++
      else if (result.gone) goneIds.push(sub.id)
    }
    if (goneIds.length > 0) {
      await db.pushSubscription.deleteMany({ where: { id: { in: goneIds } } })
    }

    return { delivered }
  },
)

/**
 * Stuurt een vrij pushbericht van de organisator naar de klant achter één
 * order (Fase 10) — bijv. "De ingang is verplaatst". Eigendom via
 * `requireOwnedEvent`, net als de betalings- en ticketacties op dezelfde
 * order. Gooit niet wanneer de klant geen apparaat heeft: `delivered: 0` is
 * een geldige uitkomst, de UI meldt dat netjes.
 */
export const sendCustomerMessagePush = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      orderId: z.uuid(),
      title: z.string().trim().min(1).max(50),
      body: z.string().trim().min(1).max(140),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser()

    const order = await db.order.findUnique({
      where: { id: data.orderId },
      select: { eventId: true, orderNumber: true, customerId: true },
    })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    await requireOwnedEvent(user.id, order.eventId)

    const result = await notify(
      'organizer.message',
      { kind: 'customer', customerId: order.customerId },
      {
        title: data.title,
        body: data.body,
        orderNumber: order.orderNumber,
        nonce: crypto.randomUUID(),
      },
    )

    return { delivered: result.delivered }
  })

// Voorkomt een "ongebruikte import" bij een lege registry; ook een expliciete
// verzekering dat de registry geladen is wanneer dit bestand wordt geïmporteerd.
void NOTIFICATIONS
