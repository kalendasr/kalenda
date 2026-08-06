import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getPushPublicKey,
  savePushSubscription,
} from '#/server/notifications.ts'

/**
 * Toestanden voor het pushmeldingen-aanzet-proces.
 *
 * - checking       → bezig met het lezen van de bestaande abonnementsstatus
 * - unsupported    → de browser biedt geen Web Push (Firefox ESR, oud Chrome, etc.)
 * - ios-needs-install → iPhone/iPad Safari buiten PWA-modus; gebruiker moet de
 *                       site eerst op het beginscherm zetten (iOS 16.4+)
 * - prompt         → klaar om toestemming te vragen
 * - subscribed     → actief abonnement
 * - denied         → de gebruiker heeft de toestemming geblokkeerd; de browser
 *                    laat de prompt niet meer zien — uitleg nodig
 * - busy           → wacht op de toestemmingsprompt of de abonnee-aanvraag
 */
export type PushState =
  | 'checking'
  | 'unsupported'
  | 'ios-needs-install'
  | 'prompt'
  | 'subscribed'
  | 'denied'
  | 'busy'

export type UsePushSubscription = {
  state: PushState
  subscribe: () => Promise<void>
}

/**
 * Vorm van `savePushSubscription`/`saveCustomerPushSubscription`: elke
 * server-functie die een abonnement opslaat past hierop, zolang de
 * aanroepplek de extra velden (zoals `orderNumber`) al gebonden heeft.
 */
export type SavePushSubscriptionFn = (input: {
  data: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string
  }
}) => Promise<{ ok: boolean }>

/** Converteert een base64url-string naar een Uint8Array (voor VAPID). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/**
 * Detecteert of we in een iOS/iPadOS Safari-omgeving zijn die de site nog NIET
 * als standalone-PWA draait (en dus nog geen Web Push ondersteunt).
 */
function isIosNeedsInstall(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPad op iOS 13+ meldt zichzelf als "Macintosh" + heeft touchPoints.
    (ua.includes('Mac') && navigator.maxTouchPoints > 1)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari-specifieke eigenschap.
    (navigator as { standalone?: boolean }).standalone === true
  return isIos && !isStandalone
}

/**
 * Hook die de volledige push-opt-in stroom beheert.
 *
 * Gebruik:
 * ```tsx
 * const { state, subscribe } = usePushSubscription()
 * if (state === 'prompt') return <button onClick={subscribe}>Zet meldingen aan</button>
 * ```
 */
export function usePushSubscription(
  // Welke save-functie te gebruiken. Organisator gebruikt de standaard
  // (requireUser); klant geeft een gebonden variant met orderNumber mee.
  saveFn: SavePushSubscriptionFn = savePushSubscription,
): UsePushSubscription {
  const [state, setState] = useState<PushState>('checking')
  // Voorkomen dat we na een unmount nog setState aanroepen.
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Op mount: bestaande toestand bepalen.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const push = 'serviceWorker' in navigator && 'PushManager' in window
    const notify = 'Notification' in window

    if (!push || !notify) {
      setState(isIosNeedsInstall() ? 'ios-needs-install' : 'unsupported')
      return
    }

    const permission = Notification.permission
    if (permission === 'denied') {
      setState('denied')
      return
    }

    // Controleer of er al een actief abonnement is. `.ready` alleen wacht
    // eeuwig als hier nog nooit een worker geregistreerd is (bijv. een klant
    // die voor het eerst op de orderpagina komt) — dus eerst zelf registreren
    // (idempotent) en dán op activatie wachten, net als in `subscribe()`.
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!mounted.current) return
        if (sub) {
          setState('subscribed')
          // Houd lastSeenAt vers in de database (één keer per sessie).
          const sessionKey = 'push-refreshed'
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1')
            const s = sub.toJSON() as {
              endpoint: string
              keys: { p256dh: string; auth: string }
            }
            saveFn({
              data: {
                endpoint: s.endpoint,
                p256dh: s.keys.p256dh,
                auth: s.keys.auth,
                userAgent: navigator.userAgent,
              },
            }).catch(() => {})
          }
        } else {
          setState(permission === 'default' ? 'prompt' : 'denied')
        }
      })
      .catch(() => {
        if (mounted.current) setState('unsupported')
      })
  }, [saveFn])

  const subscribe = useCallback(async () => {
    if (state !== 'prompt') return
    setState('busy')

    try {
      // VOLGORDE IS KRITIEK: permission-prompt eerst, pas dan SW registreren.
      // Andersom raakt in Safari de koppeling met de klik van de gebruiker kwijt
      // en verschijnt de toestemmingsprompt stilletjes niet.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'prompt')
        return
      }

      const swReg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const { publicKey } = await getPushPublicKey()
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const json = sub.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
      await saveFn({
        data: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        },
      })

      if (mounted.current) setState('subscribed')
    } catch {
      // Terugvallen op 'prompt' zodat de gebruiker het opnieuw kan proberen.
      if (mounted.current) setState('prompt')
    }
  }, [state, saveFn])

  return { state, subscribe }
}
