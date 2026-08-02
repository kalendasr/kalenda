import { describe, expect, it } from 'vitest'

import { eventPublishReadiness } from '#/lib/event-readiness.ts'
import type { ReadinessEvent } from '#/lib/event-readiness.ts'

const completeEvent: ReadinessEvent = {
  title: 'Owru Yari Festival',
  shortDescription: 'Het grootste oudejaarsfeest.',
  description: null,
  startsAt: new Date('2026-12-31T23:00:00-03:00'),
  categoryId: 'cat-1',
  venueId: 'venue-1',
  coverImage: 'https://cdn.example.com/cover.jpg',
  ticketTypeCount: 1,
}

const activePayments = { whatsappEnabled: true, bankEnabled: false }

describe('eventPublishReadiness', () => {
  it('is ready wanneer alle velden en een betaalmethode aanwezig zijn', () => {
    const result = eventPublishReadiness(completeEvent, activePayments)
    expect(result.ready).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('meldt een ontbrekende omschrijving', () => {
    const result = eventPublishReadiness(
      { ...completeEvent, shortDescription: null, description: null },
      activePayments,
    )
    expect(result.ready).toBe(false)
    expect(result.missing.map((m) => m.key)).toContain('description')
  })

  it('accepteert alleen een lange omschrijving zonder korte', () => {
    const result = eventPublishReadiness(
      { ...completeEvent, shortDescription: null, description: 'Lange tekst.' },
      activePayments,
    )
    expect(result.ready).toBe(true)
  })

  it('meldt ontbrekende betaalmethode wanneer niets actief is', () => {
    const result = eventPublishReadiness(completeEvent, {
      whatsappEnabled: false,
      bankEnabled: false,
    })
    expect(result.ready).toBe(false)
    expect(result.missing.map((m) => m.key)).toContain('payment')
  })

  it('meldt een ontbrekend tickettype', () => {
    const result = eventPublishReadiness(
      { ...completeEvent, ticketTypeCount: 0 },
      activePayments,
    )
    expect(result.ready).toBe(false)
    expect(result.missing.map((m) => m.key)).toContain('ticketType')
  })

  it('somt alle ontbrekende onderdelen op voor een leeg event', () => {
    const empty: ReadinessEvent = {
      title: null,
      shortDescription: null,
      description: null,
      startsAt: null,
      categoryId: null,
      venueId: null,
      coverImage: null,
      ticketTypeCount: 0,
    }
    const result = eventPublishReadiness(empty, null)
    expect(result.ready).toBe(false)
    expect(result.missing.map((m) => m.key)).toEqual([
      'title',
      'description',
      'startsAt',
      'category',
      'venue',
      'cover',
      'ticketType',
      'payment',
    ])
  })
})
