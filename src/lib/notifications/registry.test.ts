import { describe, expect, it } from 'vitest'

import {
  NOTIFICATIONS,
  NOTIFICATION_KEYS,
  organizerToggleableDefinitions,
} from '#/lib/notifications/registry.ts'

describe('notificatie-registry', () => {
  it('registreert precies twaalf typen', () => {
    expect(NOTIFICATION_KEYS).toHaveLength(12)
  })

  it('de map-sleutel is gelijk aan de key van de definitie', () => {
    for (const key of NOTIFICATION_KEYS) {
      expect(NOTIFICATIONS[key].key).toBe(key)
    }
  })

  it('elke definitie heeft een niet-lege label en beschrijving', () => {
    for (const key of NOTIFICATION_KEYS) {
      const def = NOTIFICATIONS[key]
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(0)
    }
  })

  it('klanttypen zijn nooit uitschakelbaar (opt-in ís de voorkeur)', () => {
    for (const key of NOTIFICATION_KEYS) {
      const def = NOTIFICATIONS[key]
      if (def.audienceKind === 'customer') {
        expect(def.toggleable).toBe(false)
      }
    }
  })

  it('een niet-uitschakelbaar type staat standaard aan', () => {
    for (const key of NOTIFICATION_KEYS) {
      const def = NOTIFICATIONS[key]
      if (!def.toggleable) {
        expect(def.defaultEnabled).toBe(true)
      }
    }
  })

  it('organizerToggleableDefinitions geeft alleen aan/uit-zetbare organisatortypen', () => {
    const defs = organizerToggleableDefinitions()
    expect(defs.length).toBeGreaterThan(0)
    for (const def of defs) {
      expect(def.audienceKind).toBe('organizer')
      expect(def.toggleable).toBe(true)
    }
  })
})
