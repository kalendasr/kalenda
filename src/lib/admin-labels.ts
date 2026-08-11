import type { AuditAction, AuditTargetType } from '#/generated/prisma/enums.ts'

/**
 * Nederlandse labels voor de beheerdersomgeving.
 *
 * De auditregels worden als volzin gelezen ("Kim Ramdien blokkeerde Jill
 * Pinas"), dus de actielabels zijn werkwoorden in de verleden tijd en geen
 * enum-namen. Een beheerder hoort een logboek te lezen, geen database.
 */

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  UserBlocked: 'blokkeerde gebruiker',
  UserUnblocked: 'hief blokkade op van',
  UserRoleGranted: 'maakte platformbeheerder',
  UserRoleRevoked: 'trok beheerdersrol in van',
  UserDeleted: 'verwijderde gebruiker',
  OrganizationDeactivated: 'deactiveerde organisatie',
  OrganizationReactivated: 'heractiveerde organisatie',
  OrganizationVerified: 'verifieerde organisatie',
  OrganizationUnverified: 'trok verificatie in van',
  EventPublished: 'publiceerde evenement',
  EventUnpublished: 'zette evenement terug naar concept',
  EventArchived: 'archiveerde evenement',
  EventDeleted: 'verwijderde evenement',
  CategoryCreated: 'maakte categorie aan',
  CategoryUpdated: 'wijzigde categorie',
}

export const AUDIT_TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  User: 'Gebruiker',
  Organization: 'Organisatie',
  Event: 'Evenement',
  Category: 'Categorie',
}

/** Ingrijpende acties krijgen een rode toon in het logboek. */
export function auditActionBadgeVariant(
  action: AuditAction,
): 'soft-destructive' | 'soft-warning' | 'soft-success' | 'soft-muted' {
  if (
    action === 'UserBlocked' ||
    action === 'UserDeleted' ||
    action === 'EventDeleted' ||
    action === 'OrganizationDeactivated'
  ) {
    return 'soft-destructive'
  }
  if (action === 'UserRoleGranted' || action === 'UserRoleRevoked') {
    return 'soft-warning'
  }
  if (
    action === 'UserUnblocked' ||
    action === 'OrganizationReactivated' ||
    action === 'OrganizationVerified' ||
    action === 'EventPublished'
  ) {
    return 'soft-success'
  }
  return 'soft-muted'
}

export const USER_ROLE_LABELS = {
  platformAdmin: 'Platformbeheerder',
  organizer: 'Organisator',
  customer: 'Klant',
} as const

export function userRoleBadgeVariant(
  role: keyof typeof USER_ROLE_LABELS,
): 'soft-destructive' | 'soft-info' | 'soft-muted' {
  if (role === 'platformAdmin') return 'soft-destructive'
  if (role === 'organizer') return 'soft-info'
  return 'soft-muted'
}
