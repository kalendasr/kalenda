import { z } from 'zod'

import { paginationSchema } from '#/lib/pagination.ts'

/**
 * Zoek-, filter- en paginatieschemas voor het beheerdersworkspace.
 *
 * Deze schemas staan bewust hier en niet in `src/server/admin/*`: de routes
 * gebruiken ze als `validateSearch` (dus in de browser), terwijl de
 * serverbestanden de database en de guards importeren. Zonder deze scheiding
 * zou een server-only module in de clientbundel belanden.
 *
 * Eén bron van waarheid voor beide kanten: de URL wordt gevalideerd én de
 * server-function valideert dezelfde vorm nog een keer. De UI is nooit de
 * enige bewaker (Fase 16 — parametermanipulatie).
 */

export const sortDirectionSchema = z.enum(['asc', 'desc']).catch('desc')

/** Paginatie plus een vrije zoekterm — de basis onder elke beheerderslijst. */
export const listInputSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
})

export type ListInput = z.infer<typeof listInputSchema>

// --- Gebruikers ------------------------------------------------------------

export const listUsersInputSchema = listInputSchema.extend({
  role: z
    .enum(['all', 'platformAdmin', 'organizer', 'customer'])
    .catch('all')
    .default('all'),
  status: z
    .enum(['all', 'active', 'blocked', 'deleted'])
    .catch('active')
    .default('active'),
  sort: z
    .enum(['createdAt', 'name', 'email'])
    .catch('createdAt')
    .default('createdAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListUsersInput = z.infer<typeof listUsersInputSchema>

// --- Organisaties ----------------------------------------------------------

export const listOrganizationsInputSchema = listInputSchema.extend({
  status: z.enum(['all', 'active', 'deactivated']).catch('all').default('all'),
  verification: z
    .enum(['all', 'verified', 'unverified'])
    .catch('all')
    .default('all'),
  sort: z.enum(['createdAt', 'name']).catch('createdAt').default('createdAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListOrganizationsInput = z.infer<
  typeof listOrganizationsInputSchema
>

// --- Evenementen -----------------------------------------------------------

export const listEventsInputSchema = listInputSchema.extend({
  status: z
    .enum(['all', 'Draft', 'Published', 'Archived'])
    .catch('all')
    .default('all'),
  organizationId: z.uuid().optional(),
  sort: z
    .enum(['createdAt', 'startsAt', 'title'])
    .catch('createdAt')
    .default('createdAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListEventsInput = z.infer<typeof listEventsInputSchema>

// --- Bestellingen ----------------------------------------------------------

export const listOrdersInputSchema = listInputSchema.extend({
  orderStatus: z
    .enum([
      'all',
      'PendingPayment',
      'AwaitingReview',
      'Paid',
      'Completed',
      'Cancelled',
      'Expired',
    ])
    .catch('all')
    .default('all'),
  paymentStatus: z
    .enum(['all', 'Unpaid', 'Pending', 'Verified', 'Rejected'])
    .catch('all')
    .default('all'),
  eventId: z.uuid().optional(),
  organizationId: z.uuid().optional(),
  sort: z
    .enum(['createdAt', 'totalCents'])
    .catch('createdAt')
    .default('createdAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListOrdersInput = z.infer<typeof listOrdersInputSchema>

// --- Betalingen ------------------------------------------------------------

export const listPaymentsInputSchema = listInputSchema.extend({
  state: z
    .enum([
      'all',
      'Waiting',
      'Requested',
      'Submitted',
      'Verified',
      'Rejected',
      'Cancelled',
    ])
    .catch('all')
    .default('all'),
  method: z
    .enum(['all', 'WhatsApp', 'BankTransfer'])
    .catch('all')
    .default('all'),
  sort: z
    .enum(['createdAt', 'verifiedAt'])
    .catch('createdAt')
    .default('createdAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListPaymentsInput = z.infer<typeof listPaymentsInputSchema>

// --- Tickets ---------------------------------------------------------------

export const listTicketsInputSchema = listInputSchema.extend({
  status: z
    .enum(['all', 'Issued', 'Sent', 'CheckedIn', 'Cancelled'])
    .catch('all')
    .default('all'),
  eventId: z.uuid().optional(),
  organizationId: z.uuid().optional(),
  ticketTypeId: z.uuid().optional(),
  sort: z
    .enum(['issuedAt', 'checkedInAt'])
    .catch('issuedAt')
    .default('issuedAt'),
  direction: sortDirectionSchema.default('desc'),
})

export type ListTicketsInput = z.infer<typeof listTicketsInputSchema>

// --- Check-ins -------------------------------------------------------------

export const listCheckInsInputSchema = listInputSchema.extend({
  result: z
    .enum(['all', 'Valid', 'AlreadyCheckedIn', 'Invalid', 'NotFound'])
    .catch('all')
    .default('all'),
  eventId: z.uuid().optional(),
})

export type ListCheckInsInput = z.infer<typeof listCheckInsInputSchema>

// --- Logboek ---------------------------------------------------------------

export const listAuditLogsInputSchema = listInputSchema.extend({
  targetType: z
    .enum(['all', 'User', 'Organization', 'Event', 'Category'])
    .catch('all')
    .default('all'),
  actorId: z.uuid().optional(),
  targetId: z.uuid().optional(),
})

export type ListAuditLogsInput = z.infer<typeof listAuditLogsInputSchema>

// --- Rapportages -----------------------------------------------------------

export const platformReportInputSchema = z.object({
  period: z
    .enum(['7d', '30d', '90d', '12m', 'all'])
    .catch('30d')
    .default('30d'),
})

export type PlatformReportInput = z.infer<typeof platformReportInputSchema>

// --- Categoriebeheer -------------------------------------------------------

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(60).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>
