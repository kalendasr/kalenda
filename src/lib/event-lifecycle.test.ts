import { describe, expect, it } from 'vitest'

import {
  assertLifecycle,
  canDeleteEvent,
  canUnpublishEvent,
} from '#/lib/event-lifecycle.ts'

describe('canUnpublishEvent (BR-203)', () => {
  it('staat terug naar concept toe zolang er niets verkocht is', () => {
    expect(canUnpublishEvent({ ticketCount: 0 })).toEqual({ ok: true })
  })

  it('weigert zodra er tickets in omloop zijn', () => {
    const result = canUnpublishEvent({ ticketCount: 1 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('verkochte tickets')
  })
})

describe('canDeleteEvent', () => {
  it('staat verwijderen toe voor een leeg concept', () => {
    expect(canDeleteEvent({ status: 'Draft', orderCount: 0 })).toEqual({
      ok: true,
    })
  })

  it('weigert verwijderen van een gepubliceerd evenement', () => {
    const result = canDeleteEvent({ status: 'Published', orderCount: 0 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('Archiveer')
  })

  it('weigert verwijderen van een gearchiveerd evenement', () => {
    expect(canDeleteEvent({ status: 'Archived', orderCount: 0 }).ok).toBe(false)
  })

  it('weigert verwijderen zodra er bestellingen zijn', () => {
    const result = canDeleteEvent({ status: 'Draft', orderCount: 1 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('bestellingen')
  })
})

describe('assertLifecycle', () => {
  it('doet niets wanneer de controle slaagt', () => {
    expect(() => assertLifecycle({ ok: true })).not.toThrow()
  })

  it('gooit de reden als foutmelding', () => {
    expect(() => assertLifecycle({ ok: false, reason: 'Mag niet.' })).toThrow(
      'Mag niet.',
    )
  })
})
