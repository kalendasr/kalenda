import webpush from 'web-push'

import { getPushEnv } from '#/lib/env.server.ts'
import type { PushPayload } from '#/lib/notifications/types.ts'

/**
 * Web Push-transport. Dunne laag om het `web-push`-pakket, dat de VAPID-JWT en
 * de payload-encryptie (RFC 8291) voor ons doet — crypto die je niet met de hand
 * wilt schrijven.
 *
 * Server-only: dit bestand importeert `web-push` (met Node-crypto) en mag nooit
 * in de client-bundel belanden. De `.server.ts`-conventie waarborgt dat.
 */

let configured = false

/** Stelt de VAPID-details één keer in, lui, uit de environment. */
function ensureConfigured(): void {
  if (configured) return
  const env = getPushEnv()
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )
  configured = true
}

/** Minimale vorm van een abonnement, zoals het in de database staat. */
export type PushTarget = {
  endpoint: string
  p256dh: string
  auth: string
}

export type PushSendResult =
  { ok: true } | { ok: false; gone: boolean; statusCode?: number }

/**
 * Verstuurt één push. Gooit niet: bepaalt alleen of het abonnement definitief
 * weg is (`gone`, HTTP 404/410) zodat de aanroeper het kan opruimen.
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<PushSendResult> {
  ensureConfigured()
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    )
    return { ok: true }
  } catch (err) {
    const statusCode =
      err instanceof webpush.WebPushError ? err.statusCode : undefined
    const gone = statusCode === 404 || statusCode === 410
    return { ok: false, gone, statusCode }
  }
}
