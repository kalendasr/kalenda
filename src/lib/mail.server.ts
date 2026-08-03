import { getMailEnv } from '#/lib/env.server.ts'

/**
 * E-mailverzending via Resend.
 *
 * We spreken de Resend REST API rechtstreeks aan met `fetch`, zodat er geen
 * extra SDK-afhankelijkheid nodig is. De afzender komt uit de environment
 * (MAIL_AFZENDER_NAAM / MAIL_AFZENDER_EMAIL).
 */

type SendMailInput = {
  to: string
  subject: string
  /** HTML-body. */
  html: string
  /** Platte-tekstvariant voor clients zonder HTML. */
  text: string
  /** Optionele bijlagen (bijv. ticket-PDF, Fase 6). */
  attachments?: Array<{ filename: string; content: Uint8Array }>
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendMail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendMailInput): Promise<void> {
  const env = getMailEnv()

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${env.MAIL_AFZENDER_NAAM} <${env.MAIL_AFZENDER_EMAIL}>`,
      to,
      subject,
      html,
      text,
      // Resend accepteert bijlagen als base64-gecodeerde inhoud.
      ...(attachments && attachments.length > 0
        ? {
            attachments: attachments.map((attachment) => ({
              filename: attachment.filename,
              content: Buffer.from(attachment.content).toString('base64'),
              encoding: 'base64',
            })),
          }
        : {}),
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(
      `E-mail kon niet verstuurd worden (${response.status}): ${details}`,
    )
  }
}
