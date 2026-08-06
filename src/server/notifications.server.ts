import { db } from '#/lib/db.server.ts'
import { Prisma } from '#/generated/prisma/client.ts'
import { resolveEnabled } from '#/lib/notifications/preferences.ts'
import { NOTIFICATIONS } from '#/lib/notifications/registry.ts'
import type {
  NotificationData,
  NotificationKey,
} from '#/lib/notifications/registry.ts'
import type { PushPayload } from '#/lib/notifications/types.ts'
import { sendPush } from '#/lib/push.server.ts'
import type { PushTarget } from '#/lib/push.server.ts'

/**
 * Verzendkern voor pushmeldingen. Server-only helper (`.server.ts`): nooit
 * importeren vanuit een route.
 *
 * `notify()` is het enige dat de rest van de app aanroept. Het:
 *  1. filtert op de voorkeur van de organisator (klanttypen kennen geen voorkeur);
 *  2. laadt de abonnementen van de doelgroep;
 *  3. bouwt de payload één keer via de pure registry-definitie;
 *  4. verstuurt naar alle apparaten parallel;
 *  5. ruimt dode abonnementen (404/410) op en telt tijdelijke fouten.
 *
 * BELANGRIJK: `notify()` gooit NOOIT. Een pushfout mag nooit een bestelling,
 * betaling of check-in ongedaan maken. Roep het altijd ná de `db.$transaction`
 * aan, in hetzelfde na-commit try/catch als de e-mailverzending — nooit binnen
 * een transactie, want een HTTP-round-trip houdt daar rij-locks open (CLAUDE.md §5).
 */

/** Wie ontvangt de melding. */
export type Audience =
  { kind: 'user'; userId: string } | { kind: 'customer'; customerId: string }

/** Boven deze drempel is een abonnement structureel dood en ruimen we het op. */
const MAX_FAILURES = 10

export async function notify<TKey extends NotificationKey>(
  key: TKey,
  audience: Audience,
  data: NotificationData[TKey],
): Promise<void> {
  try {
    const definition = NOTIFICATIONS[key]

    // 1. Voorkeur — alleen relevant voor uitschakelbare organisatortypen.
    if (audience.kind === 'user' && definition.toggleable) {
      const stored = await db.notificationPreference.findMany({
        where: { userId: audience.userId },
        select: { type: true, enabled: true },
      })
      if (!resolveEnabled(definition, stored)) return
    }

    // 2. Abonnementen van de doelgroep.
    const where =
      audience.kind === 'user'
        ? { userId: audience.userId }
        : { customerId: audience.customerId }
    const subscriptions = await db.pushSubscription.findMany({ where })
    if (subscriptions.length === 0) return

    // 3. Payload één keer bouwen. De cast is nodig omdat TypeScript de
    // build-functie over de union niet vanzelf aan de bijbehorende data koppelt;
    // de generieke `TKey` garandeert de juiste combinatie op de aanroepplek.
    const build = definition.build as (d: NotificationData[TKey]) => PushPayload
    const payload = build(data)

    // 4. Parallel versturen.
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const target: PushTarget = {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
        return { sub, result: await sendPush(target, payload) }
      }),
    )

    // 5. Opruimen op basis van de uitkomsten.
    const goneIds: Array<string> = []
    const okIds: Array<string> = []
    const failedIds: Array<string> = []
    for (const { sub, result } of results) {
      if (result.ok) okIds.push(sub.id)
      else if (result.gone) goneIds.push(sub.id)
      else failedIds.push(sub.id)
    }

    if (goneIds.length > 0) {
      await db.pushSubscription.deleteMany({ where: { id: { in: goneIds } } })
    }
    if (okIds.length > 0) {
      await db.pushSubscription.updateMany({
        where: { id: { in: okIds } },
        data: { lastSeenAt: new Date(), failureCount: 0 },
      })
    }
    if (failedIds.length > 0) {
      await db.pushSubscription.updateMany({
        where: { id: { in: failedIds } },
        data: { failureCount: { increment: 1 } },
      })
      // Abonnementen die te vaak faalden alsnog opruimen.
      await db.pushSubscription.deleteMany({
        where: { id: { in: failedIds }, failureCount: { gt: MAX_FAILURES } },
      })
    }
  } catch {
    // Stil: pushmeldingen zijn een extra kanaal, nooit een blokkade.
  }
}

/**
 * Claimt een eenmalige melding via de unieke `(type, targetKey)`-combinatie in
 * `NotificationLog` (sleutels uit `claim-key.ts`). Geeft `true` terug als dit de
 * winnende claim was — de aanroeper mag dan versturen — en `false` als de
 * melding al eerder is geclaimd (bijv. de bijna-uitverkocht-drempel was al
 * gepasseerd). Voorkomt dat elke volgende bestelling opnieuw een push stuurt
 * zodra een drempel eenmaal is gepasseerd.
 */
export async function claimNotification(
  type: string,
  targetKey: string,
): Promise<boolean> {
  try {
    await db.notificationLog.create({ data: { type, targetKey } })
    return true
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return false
    }
    throw err
  }
}
