/**
 * Ticketselectie coderen/decoderen voor de URL (search param `t`).
 * Formaat: "id:qty,id:qty". Puur en testbaar; de server her-valideert altijd.
 */

export type SelectionItem = { ticketTypeId: string; quantity: number }

export function encodeSelection(items: Array<SelectionItem>): string {
  return items
    .filter((item) => item.quantity > 0)
    .map((item) => `${item.ticketTypeId}:${item.quantity}`)
    .join(',')
}

export function decodeSelection(
  value: string | undefined,
): Array<SelectionItem> {
  if (!value) return []
  return value
    .split(',')
    .map((part) => {
      const [ticketTypeId, rawQty] = part.split(':')
      const quantity = Number(rawQty)
      if (!ticketTypeId || !Number.isInteger(quantity) || quantity < 1) {
        return null
      }
      return { ticketTypeId, quantity }
    })
    .filter((item): item is SelectionItem => item !== null)
}
