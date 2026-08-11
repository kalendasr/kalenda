import { createFileRoute } from '@tanstack/react-router'

import { db } from '#/lib/db.server.ts'
import { getCronEnv } from '#/lib/env.server.ts'
import { formatTimeNl, isSurinameToday } from '#/lib/datetime.ts'
import { orderReminderKey } from '#/lib/notifications/claim-key.ts'
import { claimNotification, notify } from '#/server/notifications.server.ts'
import { timingSafeEqualString } from '#/lib/timing-safe-equal.ts'

/**
 * BR-905: dagelijkse herinnering aan klanten van wie het event vandaag
 * plaatsvindt. Bedoeld om eenmaal per dag door een externe scheduler
 * aangeroepen te worden (bijv. Vercel Cron of een andere cronprovider) met
 * header `Authorization: Bearer <CRON_SECRET>` — er is geen scheduler binnen
 * de applicatie zelf, dus dit endpoint moet extern ingepland worden.
 *
 * Elke bestelling wordt vóór verzenden geclaimd via `claimNotification`, zodat
 * een dubbele of vertraagde cronrun nooit twee keer dezelfde herinnering stuurt.
 */
export const Route = createFileRoute('/api/cron/event-reminders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { CRON_SECRET } = getCronEnv()
        const authorization = request.headers.get('authorization') ?? ''
        if (!timingSafeEqualString(authorization, `Bearer ${CRON_SECRET}`)) {
          return new Response('Unauthorized', { status: 401 })
        }

        // Grove tijdsvensterfilter (36u rond nu) zodat niet elk gepubliceerd
        // event met orders ooit wordt opgehaald — `isSurinameToday` hieronder
        // filtert daarna nauwkeurig op de Surinaamse kalenderdag.
        const now = new Date()
        const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const windowEnd = new Date(now.getTime() + 12 * 60 * 60 * 1000)

        const events = await db.event.findMany({
          where: {
            status: 'Published',
            deletedAt: null,
            startsAt: { gte: windowStart, lte: windowEnd },
          },
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: { select: { name: true } },
            orders: {
              where: {
                deletedAt: null,
                orderStatus: { in: ['Paid', 'Completed'] },
              },
              select: { id: true, orderNumber: true, customerId: true },
            },
          },
        })

        const today = events.filter(
          (event) => event.startsAt && isSurinameToday(event.startsAt, now),
        )

        let claimed = 0
        for (const event of today) {
          const whenWhere = event.venue
            ? `${formatTimeNl(event.startsAt)} · ${event.venue.name}`
            : formatTimeNl(event.startsAt)

          for (const order of event.orders) {
            const won = await claimNotification(
              'event.reminder.customer',
              orderReminderKey(order.id),
            )
            if (!won) continue
            claimed += 1

            await notify(
              'event.reminder.customer',
              { kind: 'customer', customerId: order.customerId },
              {
                orderNumber: order.orderNumber,
                eventTitle: event.title,
                whenWhere,
              },
            )
          }
        }

        return Response.json({ events: today.length, remindersSent: claimed })
      },
    },
  },
})
