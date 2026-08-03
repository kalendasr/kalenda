import { describe, expect, it } from 'vitest'

import {
  isAdmitResult,
  resolveScanResult,
  SCAN_RESULT_LABELS,
  scanResultBadgeClass,
} from '#/lib/scan-result.ts'
import type { TicketStatus } from '#/generated/prisma/enums.ts'

describe('resolveScanResult', () => {
  it('geeft Valid voor een nog niet ingecheckt ticket (BR-801)', () => {
    expect(resolveScanResult({ exists: true, status: 'Issued' })).toBe('Valid')
    expect(resolveScanResult({ exists: true, status: 'Sent' })).toBe('Valid')
  })

  it('geeft AlreadyCheckedIn voor een al ingecheckt ticket (BR-802)', () => {
    const status: TicketStatus = 'CheckedIn'
    expect(resolveScanResult({ exists: true, status })).toBe('AlreadyCheckedIn')
  })

  it('geeft Invalid voor een geannuleerd ticket (BR-803)', () => {
    const status: TicketStatus = 'Cancelled'
    expect(resolveScanResult({ exists: true, status })).toBe('Invalid')
  })

  it('geeft NotFound voor een niet-bestaand ticket (BR-804)', () => {
    expect(resolveScanResult({ exists: false })).toBe('NotFound')
  })

  it('behandelt een onverwachte status veilig als NotFound', () => {
    // Een status buiten de bekende velden zou nooit mogen voorkomen, maar de
    // mapping mag de bezoeker nooit per ongeluk toegang geven.
    expect(resolveScanResult({ exists: true, status: undefined })).toBe(
      'NotFound',
    )
  })
})

describe('SCAN_RESULT_LABELS', () => {
  it('heeft een mensvriendelijk Nederlands label per resultaat', () => {
    expect(SCAN_RESULT_LABELS.Valid).toBe('Welkom')
    expect(SCAN_RESULT_LABELS.AlreadyCheckedIn).toBe('Al ingecheckt')
    expect(SCAN_RESULT_LABELS.Invalid).toBe('Ticket ongeldig')
    expect(SCAN_RESULT_LABELS.NotFound).toBe('Ticket niet gevonden')
  })
})

describe('scanResultBadgeClass', () => {
  it('geeft groen voor Valid, oranje voor AlreadyCheckedIn, rood voor de rest', () => {
    expect(scanResultBadgeClass('Valid')).toContain('success')
    expect(scanResultBadgeClass('AlreadyCheckedIn')).toContain('warning')
    expect(scanResultBadgeClass('Invalid')).toContain('destructive')
    expect(scanResultBadgeClass('NotFound')).toContain('destructive')
  })
})

describe('isAdmitResult', () => {
  it('toont alleen toegang bij Valid', () => {
    expect(isAdmitResult('Valid')).toBe(true)
    expect(isAdmitResult('AlreadyCheckedIn')).toBe(false)
    expect(isAdmitResult('Invalid')).toBe(false)
    expect(isAdmitResult('NotFound')).toBe(false)
  })
})
