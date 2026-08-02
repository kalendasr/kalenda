import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'

import { formatSrd } from '#/lib/money.ts'
import { availableQuantity, ticketSaleStatus } from '#/lib/ticket-sales.ts'
import type { SaleStatus } from '#/lib/ticket-sales.ts'
import { encodeSelection } from '#/lib/selection.ts'
import { Button } from '#/components/ui/button.tsx'

/**
 * Publieke ticketselectie (USER_FLOWS §7). Bezoekers kiezen hoeveelheden binnen
 * de min/max- en beschikbaarheidsgrenzen en zien een live subtotaal. "Doorgaan"
 * neemt de selectie mee naar de checkout (Fase 4). Legacy-noot: de
 * knop is daarom nog uitgeschakeld — geen dode flow (CLAUDE.md §38).
 */

type PublicTicketType = {
  id: string
  name: string
  description: string | null
  priceCents: number
  quantity: number
  reserved: number
  minimumPerOrder: number
  maximumPerOrder: number
  salesStart: string | Date | null
  salesEnd: string | Date | null
  visible: boolean
}

const STATUS_NOTE: Partial<Record<SaleStatus, string>> = {
  'not-started': 'Verkoop nog niet gestart',
  ended: 'Verkoop gesloten',
  'sold-out': 'Uitverkocht',
}

function toDate(value: string | Date | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export function TicketSelector({
  slug,
  ticketTypes,
}: {
  slug: string
  ticketTypes: Array<PublicTicketType>
}) {
  const navigate = useNavigate()
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})

  const rows = ticketTypes.map((type) => {
    const status = ticketSaleStatus(
      {
        quantity: type.quantity,
        visible: type.visible,
        salesStart: toDate(type.salesStart),
        salesEnd: toDate(type.salesEnd),
      },
      new Date(),
      type.reserved,
    )
    const cap = Math.min(
      type.maximumPerOrder,
      availableQuantity(type, type.reserved),
    )
    return { type, status, cap, onSale: status === 'on-sale' }
  })

  const subtotal = rows.reduce(
    (sum, row) => sum + row.type.priceCents * (quantities[row.type.id] ?? 0),
    0,
  )
  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)

  function setQty(type: PublicTicketType, next: number) {
    const cap = Math.min(
      type.maximumPerOrder,
      availableQuantity(type, type.reserved),
    )
    const clamped =
      next <= 0 ? 0 : Math.min(Math.max(next, type.minimumPerOrder), cap)
    setQuantities((current) => ({ ...current, [type.id]: clamped }))
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y">
        {rows.map(({ type, status, cap, onSale }) => {
          const qty = quantities[type.id] ?? 0
          return (
            <li
              key={type.id}
              className="flex items-start gap-3 py-4 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{type.name}</p>
                <p className="text-sm text-muted-foreground">
                  {type.priceCents === 0
                    ? 'Gratis'
                    : formatSrd(type.priceCents)}
                </p>
                {type.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {type.description}
                  </p>
                ) : null}
              </div>

              {onSale ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Minder ${type.name}`}
                    disabled={qty === 0}
                    onClick={() =>
                      setQty(type, qty <= type.minimumPerOrder ? 0 : qty - 1)
                    }
                  >
                    <Minus />
                  </Button>
                  <span
                    className="w-6 text-center text-sm font-medium tabular-nums"
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Meer ${type.name}`}
                    disabled={qty >= cap || cap < type.minimumPerOrder}
                    onClick={() =>
                      setQty(type, qty === 0 ? type.minimumPerOrder : qty + 1)
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {STATUS_NOTE[status] ?? ''}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">
          {totalTickets === 0
            ? 'Nog niets geselecteerd'
            : `${totalTickets} ${totalTickets === 1 ? 'ticket' : 'tickets'}`}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatSrd(subtotal)}
        </span>
      </div>

      <Button
        className="w-full"
        disabled={totalTickets === 0}
        onClick={() => {
          const selection = Object.entries(quantities).map(
            ([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }),
          )
          navigate({
            to: '/evenementen/$slug/afrekenen',
            params: { slug },
            search: { t: encodeSelection(selection) },
          })
        }}
      >
        Doorgaan naar afrekenen
      </Button>
    </div>
  )
}
