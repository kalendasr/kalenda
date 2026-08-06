/**
 * Samenvoegen van de standaardwaarde uit de registry met de opgeslagen voorkeur
 * van een organisator. Puur, zodat het los te testen is.
 *
 * Regels:
 * - Een niet-uitschakelbaar type staat altijd aan, ongeacht wat er in de database
 *   staat (verdediging in de diepte: een verouderde rij mag een klanttype nooit
 *   dempen).
 * - Anders: de opgeslagen `enabled` wint; ontbreekt die, dan `defaultEnabled`.
 */
import type { NotificationDefinition } from '#/lib/notifications/types.ts'

/** Minimale vorm van een opgeslagen voorkeur-rij. */
export type StoredPreference = {
  type: string
  enabled: boolean
}

export function resolveEnabled(
  definition: Pick<
    NotificationDefinition<unknown>,
    'key' | 'toggleable' | 'defaultEnabled'
  >,
  stored: ReadonlyArray<StoredPreference>,
): boolean {
  if (!definition.toggleable) return true

  const row = stored.find((p) => p.type === definition.key)
  return row ? row.enabled : definition.defaultEnabled
}
