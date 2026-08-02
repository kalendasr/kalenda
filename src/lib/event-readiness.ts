/**
 * Publiceer-checklist voor een evenement (BUSINESS_RULES BR-201).
 *
 * Puur en testbaar. Fase 2 controleert de event-essenties plus een actieve
 * betaalmethode. De tickettype-eis uit BR-201 komt in Fase 3; de lijst is
 * data-gedreven, dus die regel voegen we daar simpelweg toe.
 */

export type ReadinessEvent = {
  title: string | null
  shortDescription: string | null
  description: string | null
  startsAt: Date | null
  categoryId: string | null
  venueId: string | null
  coverImage: string | null
  ticketTypeCount: number
}

export type ReadinessPaymentSettings = {
  whatsappEnabled: boolean
  bankEnabled: boolean
} | null

export type ReadinessItem = { key: string; label: string }

export type Readiness = {
  ready: boolean
  missing: Array<ReadinessItem>
}

export function eventPublishReadiness(
  event: ReadinessEvent,
  paymentSettings: ReadinessPaymentSettings,
): Readiness {
  const missing: Array<ReadinessItem> = []

  if (!event.title || event.title.trim().length < 2) {
    missing.push({ key: 'title', label: 'Titel' })
  }
  if (!event.shortDescription && !event.description) {
    missing.push({ key: 'description', label: 'Omschrijving' })
  }
  if (!event.startsAt) {
    missing.push({ key: 'startsAt', label: 'Datum en tijd' })
  }
  if (!event.categoryId) {
    missing.push({ key: 'category', label: 'Categorie' })
  }
  if (!event.venueId) {
    missing.push({ key: 'venue', label: 'Locatie' })
  }
  if (!event.coverImage) {
    missing.push({ key: 'cover', label: 'Coverfoto' })
  }
  if (event.ticketTypeCount < 1) {
    missing.push({ key: 'ticketType', label: 'Minimaal één tickettype' })
  }
  if (!paymentSettings?.whatsappEnabled && !paymentSettings?.bankEnabled) {
    missing.push({ key: 'payment', label: 'Actieve betaalmethode' })
  }

  return { ready: missing.length === 0, missing }
}
