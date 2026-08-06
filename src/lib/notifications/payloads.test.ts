import { describe, expect, it } from 'vitest'

import { NOTIFICATIONS } from '#/lib/notifications/registry.ts'
import type { NotificationData } from '#/lib/notifications/registry.ts'

/**
 * Representatieve data per type. Meteen ook de plek waar we controleren dat elke
 * `build()` een geldige payload oplevert (pad-URL, niet-lege tag/tekst).
 */
const SAMPLES: NotificationData = {
  'order.created': {
    eventId: 'e1',
    eventTitle: 'Owru Yari Fest',
    orderNumber: 'KAL-1234',
    totalCents: 25000,
  },
  'payment.submitted': {
    eventId: 'e1',
    orderNumber: 'KAL-1234',
    customerName: 'Rajesh Panday',
  },
  'tickets.low_stock': {
    eventId: 'e1',
    ticketTypeName: 'Vroege Vogel',
    remaining: 4,
  },
  'cancellation.requested': {
    eventId: 'e1',
    orderNumber: 'KAL-1234',
    reason: 'Ik kan toch niet komen door werk.',
  },
  'scan.unusual': { eventId: 'e1', result: 'AlreadyCheckedIn' },
  'tickets.issued': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
    ticketCount: 2,
  },
  'payment.requested': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
  },
  'payment.rejected': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
  },
  'event.reminder.customer': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
    whenWhere: '20:00 · Torarica',
  },
  'event.changed': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
    change: 'venue',
  },
  'checkin.confirmed': {
    orderNumber: 'KAL-1234',
    eventTitle: 'Owru Yari Fest',
  },
}

describe('notificatie-payloads', () => {
  it('elke build() levert een geldige payload op', () => {
    for (const key of Object.keys(SAMPLES) as Array<keyof NotificationData>) {
      const payload = NOTIFICATIONS[key].build(SAMPLES[key] as never)
      expect(payload.title.length).toBeGreaterThan(0)
      expect(payload.body.length).toBeGreaterThan(0)
      expect(payload.url.startsWith('/')).toBe(true)
      expect(payload.tag.length).toBeGreaterThan(0)
    }
  })

  it('order.created toont het bedrag in SRD', () => {
    const p = NOTIFICATIONS['order.created'].build(SAMPLES['order.created'])
    expect(p.body).toContain('SRD')
    expect(p.body).toContain('250,00')
  })

  it('tickets.low_stock: enkelvoud vs meervoud en uitverkocht', () => {
    const one = NOTIFICATIONS['tickets.low_stock'].build({
      eventId: 'e1',
      ticketTypeName: 'VIP',
      remaining: 1,
    })
    expect(one.body).toContain('1 ticket')
    expect(one.body).not.toContain('1 tickets')

    const many = NOTIFICATIONS['tickets.low_stock'].build({
      eventId: 'e1',
      ticketTypeName: 'VIP',
      remaining: 5,
    })
    expect(many.body).toContain('5 tickets')

    const sold = NOTIFICATIONS['tickets.low_stock'].build({
      eventId: 'e1',
      ticketTypeName: 'VIP',
      remaining: 0,
    })
    expect(sold.title).toBe('Uitverkocht')
  })

  it('event.changed: annulering krijgt een eigen titel', () => {
    const cancelled = NOTIFICATIONS['event.changed'].build({
      orderNumber: 'KAL-1',
      eventTitle: 'Test',
      change: 'cancelled',
    })
    expect(cancelled.title.toLowerCase()).toContain('geannuleerd')
  })
})
