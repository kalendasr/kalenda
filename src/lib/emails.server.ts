import { sendMail } from '#/lib/mail.server.ts'
import { formatSrd } from '#/lib/money.ts'

/**
 * E-mailtemplates.
 *
 * De teksten volgen de microcopy-regels (DESIGN_SYSTEM.md §25): eenvoudige,
 * menselijke taal in het Nederlands. HTML blijft bewust simpel zodat het in
 * elke mailclient leesbaar is.
 */

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="nl">
  <body style="margin:0;background:#f4f4f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;font-weight:600;font-size:16px;">Kalenda</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
                ${body}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#71717a;">Evenementen en tickets voor Suriname</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendPasswordResetEmail({
  to,
  url,
}: {
  to: string
  url: string
}): Promise<void> {
  const title = 'Stel je wachtwoord opnieuw in'
  const html = layout(
    title,
    `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;">
       Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Klik op de knop
       hieronder om een nieuw wachtwoord te kiezen. Deze link is beperkt geldig.
     </p>
     <p style="margin:0 0 24px;">
       <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">Nieuw wachtwoord instellen</a>
     </p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
       Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren. Je wachtwoord
       blijft ongewijzigd.
     </p>`,
  )

  const text = `Stel je wachtwoord opnieuw in\n\nJe hebt gevraagd om je wachtwoord opnieuw in te stellen. Open deze link om een nieuw wachtwoord te kiezen:\n\n${url}\n\nHeb je dit niet aangevraagd? Dan kun je deze e-mail negeren.`

  await sendMail({ to, subject: title, html, text })
}

export async function sendOrderConfirmationEmail({
  to,
  orderNumber,
  eventTitle,
  totalCents,
  url,
}: {
  to: string
  orderNumber: string
  eventTitle: string
  totalCents: number
  url: string
}): Promise<void> {
  const subject = `Je bestelling ${orderNumber} — ${eventTitle}`
  const html = layout(
    'We hebben je bestelling ontvangen',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
       Bedankt voor je bestelling voor <strong>${eventTitle}</strong>. Je
       bestelnummer is <strong>${orderNumber}</strong> en het totaalbedrag is
       <strong>${formatSrd(totalCents)}</strong>.
     </p>
     <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">
       Volg je bestelling en zie de betaalinstructies via de knop hieronder. Je
       hebt geen account nodig — bewaar deze link.
     </p>
     <p style="margin:0 0 24px;">
       <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">Bekijk je bestelling</a>
     </p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
       Je tickets ontvang je zodra de organisator je betaling heeft bevestigd.
     </p>`,
  )

  const text = `We hebben je bestelling ontvangen\n\nBestelnummer: ${orderNumber}\nEvenement: ${eventTitle}\nTotaal: ${formatSrd(totalCents)}\n\nVolg je bestelling en de betaalinstructies via deze link (geen account nodig):\n${url}\n\nJe tickets ontvang je zodra de organisator je betaling heeft bevestigd.`

  await sendMail({ to, subject, html, text })
}
