import { createFileRoute } from '@tanstack/react-router'

import { db } from '#/lib/db.server.ts'
import { getCronEnv } from '#/lib/env.server.ts'
import { timingSafeEqualString } from '#/lib/timing-safe-equal.ts'
import { allowedSourceStates, nextState } from '#/lib/payment-transitions.ts'

/**
 * BR-506/507: schrijft `Expired` weg voor onbetaalde bestellingen waarvan de
 * betaaltermijn (48u) verstreken is. Tot deze cronjob draait, is verlopen zijn
 * puur afgeleid (`effectiveOrderStatus`, BR-507) — dat is genoeg om nooit meer
 * capaciteit te reserveren, maar laat rapportages/adminlijsten die op de
 * opgeslagen `orderStatus` filteren afwijken van wat de UI toont. Bedoeld om
 * periodiek door een externe scheduler aangeroepen te worden, net als
 * `event-reminders`.
 *
 * Alleen `PendingPayment`-orders komen in aanmerking (BR-506) — een order die
 * al bewijs heeft ingediend (`AwaitingReview`) verloopt bewust niet vanzelf
 * (zie order-status.ts): die blijft bij de organisator liggen totdat hij
 * goed- of afgekeurd wordt.
 */
export const Route = createFileRoute('/api/cron/expire-orders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { CRON_SECRET } = getCronEnv()
        const authorization = request.headers.get('authorization') ?? ''
        if (!timingSafeEqualString(authorization, `Bearer ${CRON_SECRET}`)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const now = new Date()
        const candidates = await db.order.findMany({
          where: {
            orderStatus: 'PendingPayment',
            deletedAt: null,
            expiresAt: { lt: now },
          },
          select: { id: true, payment: { select: { id: true, state: true } } },
        })

        let expired = 0
        for (const order of candidates) {
          const swept = await db.$transaction(async (tx) => {
            // Conditionele update: alleen wij zetten hem definitief op
            // Expired als hij nog steeds PendingPayment is (zelfde
            // gelijktijdigheidspatroon als `resolveScan`/`approvePayment`).
            const updated = await tx.order.updateMany({
              where: { id: order.id, orderStatus: 'PendingPayment' },
              data: { orderStatus: 'Expired' },
            })
            if (updated.count !== 1) return false

            if (order.payment && nextState(order.payment.state, 'cancel')) {
              await tx.payment.updateMany({
                where: {
                  id: order.payment.id,
                  state: { in: allowedSourceStates('cancel') },
                },
                data: { state: 'Cancelled' },
              })
            }
            return true
          })
          if (swept) expired += 1
        }

        return Response.json({ expired })
      },
    },
  },
})
