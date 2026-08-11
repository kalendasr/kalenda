import { afterEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { claimNotification, notify } from '#/server/notifications.server.ts'
import { Route } from '#/routes/api/cron/event-reminders.ts'

const CRON_SECRET = 'x'.repeat(32)

// Vitest hoist `vi.mock` altijd naar de top van het bestand, dus de volgorde
// hier (ná de imports/const) is voor de uitvoering geen probleem.
vi.mock('#/lib/db.server.ts', () => ({
  db: { event: { findMany: vi.fn() } },
}))
vi.mock('#/lib/env.server.ts', () => ({
  getCronEnv: () => ({ CRON_SECRET: 'x'.repeat(32) }),
}))
vi.mock('#/server/notifications.server.ts', () => ({
  claimNotification: vi.fn(),
  notify: vi.fn(),
}))
// Marker-gebaseerde stub: events met een even datum-marker gelden als
// "vandaag", zodat de test niet van de werkelijke kalenderdatum afhangt.
vi.mock('#/lib/datetime.ts', () => ({
  isSurinameToday: (date: Date) => date.getUTCDate() % 2 === 0,
  formatTimeNl: () => '20:00',
}))

// De route wordt niet via createServerFn opgebouwd, dus de handler is
// rechtstreeks aanroepbaar zonder Start-runtime context.
const getHandler = () => (Route as any).options.server.handlers.GET

function request(authorization?: string) {
  return new Request('http://localhost/api/cron/event-reminders', {
    headers: authorization ? { authorization } : {},
  })
}

const TODAY = new Date('2026-08-10T00:00:00Z') // even dag → "vandaag"
const TOMORROW = new Date('2026-08-11T00:00:00Z') // oneven dag → niet vandaag

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cron/event-reminders', () => {
  it('weigert een verzoek zonder geldig CRON_SECRET', async () => {
    const res = await getHandler()({ request: request() })
    expect(res.status).toBe(401)
    expect(db.event.findMany).not.toHaveBeenCalled()
  })

  it('weigert een verzoek met een verkeerd secret', async () => {
    const res = await getHandler()({ request: request('Bearer verkeerd') })
    expect(res.status).toBe(401)
  })

  it('bevraagt alleen gepubliceerde events binnen een tijdsvenster rond nu', async () => {
    vi.mocked(db.event.findMany).mockResolvedValue([])

    await getHandler()({ request: request(`Bearer ${CRON_SECRET}`) })

    expect(db.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'Published',
          deletedAt: null,
          startsAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
      }),
    )
  })

  it('slaat events over die niet vandaag plaatsvinden', async () => {
    vi.mocked(db.event.findMany).mockResolvedValue([
      {
        id: 'event-later',
        title: 'Later event',
        startsAt: TOMORROW,
        venue: { name: 'Torarica' },
        orders: [{ id: 'order-1', orderNumber: 'ORD-1', customerId: 'cust-1' }],
      },
    ] as any)

    const res = await getHandler()({
      request: request(`Bearer ${CRON_SECRET}`),
    })
    const body = await res.json()

    expect(body).toEqual({ events: 0, remindersSent: 0 })
    expect(claimNotification).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('claimt en verstuurt een herinnering per bestelling van een event dat vandaag is', async () => {
    vi.mocked(db.event.findMany).mockResolvedValue([
      {
        id: 'event-today',
        title: 'Zomerfeest',
        startsAt: TODAY,
        venue: { name: 'Torarica' },
        orders: [
          { id: 'order-1', orderNumber: 'ORD-1', customerId: 'cust-1' },
          { id: 'order-2', orderNumber: 'ORD-2', customerId: 'cust-2' },
        ],
      },
    ] as any)
    vi.mocked(claimNotification).mockResolvedValue(true)

    const res = await getHandler()({
      request: request(`Bearer ${CRON_SECRET}`),
    })
    const body = await res.json()

    expect(claimNotification).toHaveBeenCalledWith(
      'event.reminder.customer',
      'order:order-1',
    )
    expect(claimNotification).toHaveBeenCalledWith(
      'event.reminder.customer',
      'order:order-2',
    )
    expect(notify).toHaveBeenCalledWith(
      'event.reminder.customer',
      { kind: 'customer', customerId: 'cust-1' },
      {
        orderNumber: 'ORD-1',
        eventTitle: 'Zomerfeest',
        whenWhere: '20:00 · Torarica',
      },
    )
    expect(body).toEqual({ events: 1, remindersSent: 2 })
  })

  it('slaat een bestelling over die al eerder geclaimd is (geen dubbele push)', async () => {
    vi.mocked(db.event.findMany).mockResolvedValue([
      {
        id: 'event-today',
        title: 'Zomerfeest',
        startsAt: TODAY,
        venue: { name: 'Torarica' },
        orders: [{ id: 'order-1', orderNumber: 'ORD-1', customerId: 'cust-1' }],
      },
    ] as any)
    vi.mocked(claimNotification).mockResolvedValue(false)

    const res = await getHandler()({
      request: request(`Bearer ${CRON_SECRET}`),
    })
    const body = await res.json()

    expect(notify).not.toHaveBeenCalled()
    expect(body).toEqual({ events: 1, remindersSent: 0 })
  })

  it('gebruikt alleen de tijd wanneer het event geen locatie heeft', async () => {
    vi.mocked(db.event.findMany).mockResolvedValue([
      {
        id: 'event-today',
        title: 'Zomerfeest',
        startsAt: TODAY,
        venue: null,
        orders: [{ id: 'order-1', orderNumber: 'ORD-1', customerId: 'cust-1' }],
      },
    ] as any)
    vi.mocked(claimNotification).mockResolvedValue(true)

    await getHandler()({ request: request(`Bearer ${CRON_SECRET}`) })

    expect(notify).toHaveBeenCalledWith(
      'event.reminder.customer',
      { kind: 'customer', customerId: 'cust-1' },
      { orderNumber: 'ORD-1', eventTitle: 'Zomerfeest', whenWhere: '20:00' },
    )
  })
})
