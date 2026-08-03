/**
 * Ticketnummer (BUSINESS_RULES BR-700/701).
 *
 * Elke ticket krijgt een uniek, botvrij nummer. We gebruiken een UUID: dat is
 * eenvoudig uniek af te dwingen (unique-constraint) en hoeft niet gereserveerd
 * of bijgehouden te worden. Het nummer staat in de QR-code en is daarmee de
 * enige identificatie voor de scanner (Fase 7).
 *
 * Puur en testbaar; geen database nodig.
 */

import { randomUUID } from 'node:crypto'

/** Genereert een uniek ticketnummer (UUID). */
export function generateTicketNumber(): string {
  return randomUUID()
}
