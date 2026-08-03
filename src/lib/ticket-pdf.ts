/**
 * Ticket-PDF (BUSINESS_RULES BR-700..BR-704).
 *
 * Bouwt een PDF waarin elke ticket zijn eigen pagina krijgt met een QR-code
 * (Fase 6). De QR-inhoud komt uit `ticketQrPayload`, zodat server en client
 * exact dezelfde code produceren en bij opnieuw versturen de QR gelijk blijft.
 *
 * We gebruiken `qrcode` (PNG) en `pdf-lib` (ingebouwd Helvetica-lettertype, dus
 * geen font-insluiting nodig). De functie is puur: input-objecten in, PDF-bytes
 * uit, geen database.
 */

import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatSrd } from '#/lib/money.ts'
import { formatDateNl } from '#/lib/datetime.ts'
import { ticketQrPayload } from '#/lib/ticket-qr.ts'

/** Eén ticket in de PDF, samen met de context waarin het getoond wordt. */
export type TicketPdfTicket = {
  ticketNumber: string
  ticketTypeName: string
}

/** Contextgegevens die op de ticketpagina getoond worden. */
export type TicketPdfContext = {
  eventTitle: string
  startsAt: Date | null
  venueName: string | null
  orderNumber: string
  customerName: string
  totalCents: number
  baseUrl: string
}

const PAGE_WIDTH = 595 // A4-breedte punten
const PAGE_HEIGHT = 250 // korte, ticket-achtige strook per ticket

/**
 * Genereert de QR-PNG (Uint8Array) voor een ticket.
 * @private Wordt gebruikt door `buildTicketPdf`.
 */
export async function ticketQrPng(
  ticketNumber: string,
  baseUrl: string,
): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(ticketQrPayload(ticketNumber, baseUrl), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
  })
  // pdf-lib eist een Uint8Array uit dezelfde realm als het document. `qrcode`
  // geeft een Node Buffer terug, die in de jsdom-testomgeving niet als
  // "Uint8Array" herkend wordt — dus kopiëren we expliciet naar een verse array.
  return new Uint8Array(buffer)
}

/**
 * Bouwt een PDF met één pagina per ticket.
 *
 * @throws Wanneer de PDF niet gegenereerd kan worden.
 */
export async function buildTicketPdf(
  context: TicketPdfContext,
  tickets: TicketPdfTicket[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const detail = formatDateNl(context.startsAt)

  for (const ticket of tickets) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

    // Kopregel met event + ordernummer.
    page.drawText(context.eventTitle.toUpperCase(), {
      x: 32,
      y: PAGE_HEIGHT - 40,
      size: 13,
      font: fontBold,
      color: rgb(0.14, 0.15, 0.18),
    })
    page.drawText(`Bestelnummer ${context.orderNumber}`, {
      x: 32,
      y: PAGE_HEIGHT - 56,
      size: 9,
      font: font,
      color: rgb(0.44, 0.45, 0.48),
    })

    // Ticketgegevens.
    page.drawText(ticket.ticketTypeName, {
      x: 32,
      y: PAGE_HEIGHT - 96,
      size: 15,
      font: fontBold,
      color: rgb(0.14, 0.15, 0.18),
    })
    if (detail) {
      page.drawText(detail, {
        x: 32,
        y: PAGE_HEIGHT - 112,
        size: 10,
        font: font,
        color: rgb(0.44, 0.45, 0.48),
      })
    }
    if (context.venueName) {
      page.drawText(context.venueName, {
        x: 32,
        y: PAGE_HEIGHT - 126,
        size: 10,
        font: font,
        color: rgb(0.44, 0.45, 0.48),
      })
    }

    // QR-code (rechts) met ticketnummer eronder.
    const png = await ticketQrPng(ticket.ticketNumber, context.baseUrl)
    const qr = await doc.embedPng(png)
    page.drawImage(qr, {
      x: PAGE_WIDTH - 32 - 140,
      y: 32,
      width: 140,
      height: 140,
    })
    page.drawText(ticket.ticketNumber, {
      x: PAGE_WIDTH - 32 - 140,
      y: 16,
      size: 7,
      font: font,
      color: rgb(0.44, 0.45, 0.48),
    })

    // Voet met klant en totaal (grenslijn).
    page.drawLine({
      start: { x: 32, y: 56 },
      end: { x: PAGE_WIDTH - 32 - 140 - 20, y: 56 },
      thickness: 1,
      color: rgb(0.88, 0.89, 0.92),
    })
    page.drawText(context.customerName, {
      x: 32,
      y: 34,
      size: 9,
      font: font,
      color: rgb(0.44, 0.45, 0.48),
    })
    page.drawText(formatSrd(context.totalCents), {
      x: 32,
      y: 20,
      size: 9,
      font: fontBold,
      color: rgb(0.14, 0.15, 0.18),
    })
  }

  return doc.save()
}
