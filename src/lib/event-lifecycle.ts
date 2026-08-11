import type { EventStatus } from '#/generated/prisma/enums.ts'

/**
 * Levenscyclusregels van een evenement (BR-202/203), los van wie de actie
 * uitvoert.
 *
 * Deze regels stonden eerder verstopt in `src/server/event.ts` en golden
 * daarmee alleen voor de organisator. Een platformbeheerder mag de
 * eigenaarschapscontrole overslaan — dat is precies wat zijn rol betekent —
 * maar níet de businessregels. Door ze hier als pure functies te zetten
 * gebruiken beide paden aantoonbaar dezelfde logica.
 *
 * De foutteksten zijn onderdeel van de regel: ze leggen uit wat de gebruiker
 * in plaats daarvan kan doen, in plaats van alleen "niet toegestaan".
 */

export type LifecycleCheck = { ok: true } | { ok: false; reason: string }

/**
 * Terug naar concept (BR-203): mag zolang er geen tickets verkocht zijn.
 * Zodra er tickets in omloop zijn, zou depubliceren de houders een evenement
 * afnemen dat ze al betaald hebben.
 */
export function canUnpublishEvent(input: {
  ticketCount: number
}): LifecycleCheck {
  if (input.ticketCount > 0) {
    return {
      ok: false,
      reason:
        'Dit evenement heeft al verkochte tickets en kan niet meer naar concept terug.',
    }
  }
  return { ok: true }
}

/**
 * Verwijderen (soft delete) mag alleen voor een concept zonder bestellingen.
 * Alles daarbuiten is historische of financiële data die bewaard moet blijven
 * — archiveren is dan het juiste alternatief.
 */
export function canDeleteEvent(input: {
  status: EventStatus
  orderCount: number
}): LifecycleCheck {
  if (input.status !== 'Draft') {
    return {
      ok: false,
      reason:
        'Een gepubliceerd evenement kan niet verwijderd worden. Archiveer het in plaats daarvan.',
    }
  }
  if (input.orderCount > 0) {
    return {
      ok: false,
      reason:
        'Dit evenement heeft bestellingen en kan niet verwijderd worden. Archiveer het in plaats daarvan.',
    }
  }
  return { ok: true }
}

/** Gooit de reden als Error wanneer de controle faalt. */
export function assertLifecycle(check: LifecycleCheck): void {
  if (!check.ok) throw new Error(check.reason)
}
