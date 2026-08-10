import { defineNotification } from '#/lib/notifications/types.ts'
import { truncate } from '#/lib/notifications/truncate.ts'

export type OrganizerMessageData = {
  title: string
  body: string
  orderNumber: string
  /** Maakt elk bericht een eigen tag, zodat een tweede bericht het eerste niet wegduwt. */
  nonce: string
}

/**
 * Klant: vrij bericht dat de organisator zelf naar één klant stuurt (bijv.
 * "De ingang is verplaatst naar hal B"). In tegenstelling tot de andere
 * klanttypen komt de tekst niet uit een vaste sjabloon maar rechtstreeks van
 * de organisator — de titel-/bodylimieten worden al bij het versturen
 * afgedwongen (`server/notifications.ts`), `truncate()` is hier de laatste
 * garantie tegen het ~4 KB-payloadbudget.
 */
export const organizerMessage = defineNotification<OrganizerMessageData>({
  key: 'organizer.message',
  label: 'Bericht van de organisator',
  description: 'Een los bericht dat de organisator zelf naar de klant stuurt.',
  audienceKind: 'customer',
  toggleable: false,
  defaultEnabled: true,
  build: (data) => ({
    title: truncate(data.title, 50),
    body: truncate(data.body, 140),
    url: `/bestelling/${data.orderNumber}`,
    tag: `organizer-message:${data.orderNumber}:${data.nonce}`,
  }),
})
