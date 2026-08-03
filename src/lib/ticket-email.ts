import { sendMail } from '#/lib/mail.server.ts'
import { buildTicketPdf } from '#/lib/ticket-pdf.ts'
import type { TicketPdfContext, TicketPdfTicket } from '#/lib/ticket-pdf.ts'

/**
 * Ticket-e-mail (Fase 6, BR-700/702/704).
 *
 * Verstuurt de ticket-PDF als bijlage én een link naar de orderpagina, zodat de
 * klant de QR ook later (opnieuw) kan bekijken. De QR blijft bij opnieuw
 * versturen gelijk (BR-704); alleen de e-mail is nieuw.
 *
 * Teksten volgen de microcopy-regels (DESIGN_SYSTEM.md §11/§25): eenvoudig,
 * menselijk Nederlands.
 */

type TicketEmailInput = {
  to: string
  customerName: string
  orderNumber: string
  eventTitle: string
  startsAt: Date | null
  venueName: string | null
  totalCents: number
  baseUrl: string
  orderUrl: string
  tickets: TicketPdfTicket[]
}

export async function sendTicketEmail(input: TicketEmailInput): Promise<void> {
  const pdfContext: TicketPdfContext = {
    eventTitle: input.eventTitle,
    startsAt: input.startsAt,
    venueName: input.venueName,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    totalCents: input.totalCents,
    baseUrl: input.baseUrl,
  }
  const pdf = await buildTicketPdf(pdfContext, input.tickets)

  const subject = `Je tickets — ${input.eventTitle}`
  const html = `<!doctype html>
<html lang="nl">
  <body style="margin:0;background:#f4f4f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;font-weight:600;font-size:16px;">Kalenda</td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:20px;">Hier zijn je tickets</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
              Bedankt voor je aankoop bij <strong>${input.eventTitle}</strong>. Je
              tickets zitten als PDF bijgesloten — bewaar ze goed, de QR-code op
              het ticket is je toegangsbewijs.
            </p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">
              Je kunt je tickets ook altijd bekijken via je bestelpagina:
              <a href="${input.orderUrl}" style="color:#2563eb;">${input.orderUrl}</a>
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
              Kom je niet bij je tickets? Lees de QR-code dan op je telefoon
              voor bij de ingang van het evenement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = `Hier zijn je tickets\n\nBedankt voor je aankoop bij ${input.eventTitle}. Je tickets zitten als PDF bijgesloten. Je kunt ze ook altijd bekijken via je bestelpagina:\n${input.orderUrl}`

  await sendMail({
    to: input.to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `kalenda-tickets-${input.orderNumber}.pdf`,
        content: pdf,
      },
    ],
  })
}
