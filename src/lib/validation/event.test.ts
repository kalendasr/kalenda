import { describe, expect, it } from 'vitest'

import {
  contentItemSchema,
  createEventSchema,
  eventDetailsSchema,
  eventIntroSchema,
  venueSchema,
} from '#/lib/validation/event.ts'

describe('createEventSchema', () => {
  it('vereist een titel van minimaal 2 tekens', () => {
    expect(createEventSchema.safeParse({ title: 'A' }).success).toBe(false)
    expect(createEventSchema.safeParse({ title: 'Festival' }).success).toBe(
      true,
    )
  })
})

describe('eventDetailsSchema', () => {
  const base = { title: 'Festival', timezone: 'America/Paramaribo' }

  it('accepteert een einddatum na de startdatum', () => {
    const result = eventDetailsSchema.safeParse({
      ...base,
      startsAt: '2026-09-01T20:00',
      endsAt: '2026-09-01T23:00',
    })
    expect(result.success).toBe(true)
  })

  it('wijst een einddatum vóór de startdatum af', () => {
    const result = eventDetailsSchema.safeParse({
      ...base,
      startsAt: '2026-09-01T23:00',
      endsAt: '2026-09-01T20:00',
    })
    expect(result.success).toBe(false)
  })

  it('staat een event zonder datums toe (concept)', () => {
    expect(eventDetailsSchema.safeParse(base).success).toBe(true)
  })
})

describe('eventIntroSchema', () => {
  it('staat een lege introductie toe (concept)', () => {
    expect(eventIntroSchema.safeParse({}).success).toBe(true)
  })

  it('accepteert een korte en lange omschrijving', () => {
    const result = eventIntroSchema.safeParse({
      shortDescription: 'Een avond vol muziek.',
      description: 'Dit is de **volledige** omschrijving met opmaak.',
    })
    expect(result.success).toBe(true)
  })
})

describe('venueSchema', () => {
  it('vereist een naam', () => {
    expect(
      venueSchema.safeParse({ name: '', country: 'Suriname' }).success,
    ).toBe(false)
    expect(
      venueSchema.safeParse({ name: 'Kwaku', country: 'Suriname' }).success,
    ).toBe(true)
  })
})

describe('contentItemSchema', () => {
  it('accepteert een geldig content-item', () => {
    const result = contentItemSchema.safeParse({
      type: 'Faq',
      title: 'Mag ik eten meenemen?',
      content: 'Nee, er zijn foodtrucks aanwezig.',
    })
    expect(result.success).toBe(true)
  })

  it('wijst een onbekend type af', () => {
    const result = contentItemSchema.safeParse({
      type: 'Sponsor',
      title: 'x',
      content: 'y',
    })
    expect(result.success).toBe(false)
  })
})
