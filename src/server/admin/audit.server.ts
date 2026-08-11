import { db } from '#/lib/db.server.ts'
import type { AuditAction, AuditTargetType } from '#/generated/prisma/enums.ts'
import type { Prisma } from '#/generated/prisma/client.ts'

/**
 * Schrijver van het audit log (Fase 12).
 *
 * Server-only en géén server function: het log mag uitsluitend als
 * neveneffect van een al geautoriseerde adminactie ontstaan, nooit als
 * losstaande aanroep vanuit de browser. Er bestaat daarom ook geen update- of
 * delete-pad — het log is append-only.
 *
 * De aanroeper geeft altijd een `targetLabel` mee: een momentopname van de
 * naam op het moment van de actie. Zonder die snapshot wordt het log
 * onleesbaar zodra een gebruiker hernoemd of een evenement verwijderd is.
 */

export type AuditEntry = {
  actorId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  targetLabel: string
  /**
   * Alleen de gewijzigde toestand (bijv. `{ before, after }`) of context die
   * de actie verklaart. Nooit wachtwoorden, tokens, sessies, betaalbewijzen
   * of andere geheimen — die horen niet in een log dat elke beheerder leest.
   */
  metadata?: Prisma.InputJsonValue
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel,
      metadata: entry.metadata,
    },
  })
}
