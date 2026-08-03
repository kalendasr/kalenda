import { describe, expect, it } from 'vitest'

import { buildTicketPdf, ticketQrPng } from '#/lib/ticket-pdf.ts'
import type { TicketPdfContext } from '#/lib/ticket-pdf.ts'
import { generateTicketNumber } from '#/lib/ticket-number.ts'

const context: TicketPdfContext = {
  eventTitle: 'Big Summer Festival',
  startsAt: new Date('2026-08-15T20:00:00-03:00'),
  venueName: 'Paleis Tuin',
  orderNumber: 'K-12345',
  customerName: 'Jan de Vries',
  totalCents: 5000,
  baseUrl: 'https://kalenda.sr',
}

describe('ticketQrPng', () => {
  it('geeft een niet-lege PNG terug', async () => {
    const png = await ticketQrPng('ticket-1', 'https://kalenda.sr')
    expect(png.length).toBeGreaterThan(0)
    // PNG-magic bytes.
    expect([...png.slice(0, 4)]).toEqual([137, 80, 78, 71])
  })
})

describe('buildTicketPdf', () => {
  it('geeft een valide, niet-lege PDF terug met elke ticket op een pagina', async () => {
    const tickets = [
      { ticketNumber: generateTicketNumber(), ticketTypeName: 'Early Bird' },
      { ticketNumber: generateTicketNumber(), ticketTypeName: 'Early Bird' },
    ]
    const pdf = await buildTicketPdf(context, tickets)
    expect(pdf.length).toBeGreaterThan(0)

    const header = new TextDecoder().decode(pdf.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('geeft ook een lege ticketlijst een valide PDF', async () => {
    const pdf = await buildTicketPdf(context, [])
    expect(pdf.length).toBeGreaterThan(0)
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-')
  })
})
