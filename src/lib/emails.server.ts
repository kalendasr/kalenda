import { sendMail } from '#/lib/mail.server.ts'

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
