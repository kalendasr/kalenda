import type {
  TicketDeliveryChannel,
  TicketStatus,
} from '#/generated/prisma/client.ts'

/**
 * Label- en badgehulpen voor ticketstatus en leveringskanaal (BR-700..BR-704).
 * Puur en testbaar, zelfde patroon als order-status.ts.
 */

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  Issued: 'Aangemaakt',
  Sent: 'Verstuurd',
  CheckedIn: 'Gebruikt',
  Cancelled: 'Ingetrokken',
}

export function ticketStatusBadgeVariant(
  status: TicketStatus,
): 'soft-success' | 'soft-info' | 'soft-destructive' | 'soft-muted' {
  if (status === 'CheckedIn') return 'soft-info'
  if (status === 'Sent') return 'soft-success'
  if (status === 'Cancelled') return 'soft-destructive'
  return 'soft-muted'
}

export const TICKET_DELIVERY_CHANNEL_LABELS: Record<
  TicketDeliveryChannel,
  string
> = {
  Email: 'e-mail',
  WhatsApp: 'WhatsApp',
}
