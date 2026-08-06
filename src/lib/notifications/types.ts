/**
 * Kern-typen van de notificatie-registry.
 *
 * PUUR en zonder afhankelijkheden op de database of het `web-push`-pakket, zodat
 * alle tekstopbouw los te testen is — hetzelfde patroon als order-status.ts en
 * scan-result.ts.
 *
 * Elk notificatietype is één `NotificationDefinition`: een zichzelf beschrijvend
 * blokje met een sleutel, labels voor het instellingenscherm, een doelgroep en
 * een pure `build`-functie die data omzet naar de tekst die de browser toont.
 */

/** Wat de browser uiteindelijk toont. Versleuteld ~4 KB max: houd het kort. */
export type PushPayload = {
  title: string
  body: string
  /** Deeplink die opengaat bij een klik. Altijd een pad, nooit een volledige URL. */
  url: string
  /**
   * Collapse-sleutel: een nieuwere melding met dezelfde tag vervangt de oude,
   * zodat de organisator niet tien losse "nieuwe bestelling"-meldingen krijgt.
   */
  tag: string
}

/** Wie ontvangt dit type: de organisator of de gastklant. */
export type AudienceKind = 'organizer' | 'customer'

export type NotificationDefinition<TData> = {
  /** Stabiele sleutel, bijv. "order.created". Wordt opgeslagen in de database. */
  key: string
  /** Korte naam in het instellingenscherm. Nederlands. */
  label: string
  /** Eén zin uitleg onder het label. Nederlands. */
  description: string
  audienceKind: AudienceKind
  /**
   * Mag de organisator dit type uitzetten? Klanttypen staan altijd aan — een
   * klant heeft geen beheerscherm, opt-in ís zijn voorkeur.
   */
  toggleable: boolean
  /** Standaardwaarde wanneer er nog geen voorkeur is opgeslagen. */
  defaultEnabled: boolean
  /** PUUR: data erin, tekst eruit. Geen database, geen fetch. */
  build: (data: TData) => PushPayload
}

/**
 * Identiteitshelper. Puur bedoeld om het generieke type `TData` af te leiden uit
 * de meegegeven `build`-functie, zodat aanroepers autocomplete krijgen op de data.
 */
export function defineNotification<TData>(
  def: NotificationDefinition<TData>,
): NotificationDefinition<TData> {
  return def
}
