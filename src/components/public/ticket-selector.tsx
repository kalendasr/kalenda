import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Minus, Plus, ShieldCheck } from 'lucide-react'

import { formatMoney } from '#/lib/money.ts'
import { useCurrency } from '#/lib/currency.ts'
import { availableQuantity, ticketSaleStatus } from '#/lib/ticket-sales.ts'
import type { SaleStatus } from '#/lib/ticket-sales.ts'
import { encodeSelection } from '#/lib/selection.ts'
import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'

/**
 * Publieke ticketselectie (USER_FLOWS §7). Bezoekers kiezen hoeveelheden binnen
 * de min/max- en beschikbaarheidsgrenzen en zien een live subtotaal. "Doorgaan"
 * neemt de selectie mee naar de checkout, die prijs en beschikbaarheid altijd
 * opnieuw valideert (server is de bron van waarheid, niet dit paneel).
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

const REMAINING_LOW_THRESHOLD = 10

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
  const { currency } = useCurrency()
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
    const remaining = availableQuantity(type, type.reserved)
    const cap = Math.min(type.maximumPerOrder, remaining)
    return { type, status, remaining, cap, onSale: status === 'on-sale' }
  })

  const subtotal = rows.reduce(
    (sum, row) => sum + row.type.priceCents * (quantities[row.type.id] ?? 0),
    0,
  )
  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)
  const remainingTotal = rows.reduce((sum, row) => sum + row.remaining, 0)
  const anyOnSale = rows.some((row) => row.onSale)

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
    <div className="overflow-hidden rounded-[20px] border bg-card shadow-[0_22px_50px_-34px_rgba(11,18,32,0.4)]">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-[18px]">
        <span className="text-[17px] font-extrabold tracking-tight">
          Tickets
        </span>
        {anyOnSale &&
        remainingTotal > 0 &&
        remainingTotal <= REMAINING_LOW_THRESHOLD ? (
          <span className="font-eyebrow rounded-md bg-warning px-2.5 py-1.5 text-[11px] text-warning-foreground uppercase">
            nog {remainingTotal} {remainingTotal === 1 ? 'ticket' : 'tickets'}
          </span>
        ) : null}
      </div>

      <div className="px-5 pt-1.5 pb-1">
        {rows.map(({ type, status, cap, remaining, onSale }, i) => {
          const qty = quantities[type.id] ?? 0
          const low =
            onSale && remaining > 0 && remaining <= REMAINING_LOW_THRESHOLD
          return (
            <div
              key={type.id}
              className={cn(
                'flex items-start gap-3.5 py-4',
                i > 0 && 'border-t',
              )}
            >
              <div className="min-w-0 flex-1">
                <span className="text-[15.5px] font-bold tracking-tight">
                  {type.name}
                </span>
                <div className="mt-1 text-[15px] font-extrabold">
                  {type.priceCents === 0
                    ? 'Gratis'
                    : formatMoney(type.priceCents, currency)}
                </div>
                {type.description ? (
                  <p className="mt-1 text-[13px] leading-normal text-muted-foreground">
                    {type.description}
                  </p>
                ) : null}
                {onSale ? (
                  <p
                    className={cn(
                      'font-eyebrow mt-1.5 text-[11px] uppercase',
                      low ? 'text-warning-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {remaining === 0
                      ? 'uitverkocht'
                      : `nog ${remaining} beschikbaar`}
                  </p>
                ) : null}
              </div>

              {onSale ? (
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border bg-card p-[3px]">
                  <button
                    type="button"
                    aria-label={`Minder ${type.name}`}
                    disabled={qty === 0}
                    onClick={() =>
                      setQty(type, qty <= type.minimumPerOrder ? 0 : qty - 1)
                    }
                    className="grid size-[34px] place-items-center rounded-[9px] text-foreground enabled:cursor-pointer enabled:hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/40"
                  >
                    <Minus className="size-[15px]" strokeWidth={2.6} />
                  </button>
                  <span className="w-[30px] text-center text-[15px] font-extrabold tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Meer ${type.name}`}
                    disabled={qty >= cap || cap < type.minimumPerOrder}
                    onClick={() =>
                      setQty(type, qty === 0 ? type.minimumPerOrder : qty + 1)
                    }
                    className="grid size-[34px] place-items-center rounded-[9px] text-foreground enabled:cursor-pointer enabled:hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/40"
                  >
                    <Plus className="size-[15px]" strokeWidth={2.6} />
                  </button>
                </div>
              ) : (
                <span className="pt-0.5 text-sm font-medium text-muted-foreground">
                  {STATUS_NOTE[status] ?? ''}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t bg-muted/40 px-5 pt-4 pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-bold">Totaal</span>
          <span className="text-[22px] font-extrabold tracking-tight tabular-nums">
            {formatMoney(subtotal, currency)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalTickets === 0
            ? 'Nog niets geselecteerd'
            : `${totalTickets} ${totalTickets === 1 ? 'ticket' : 'tickets'}`}
        </p>

        <Button
          className="mt-4 h-[52px] w-full rounded-[14px] text-[15.5px] font-extrabold"
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
          {totalTickets === 0 ? 'Kies je tickets' : 'Doorgaan naar afrekenen'}
        </Button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] font-semibold text-muted-foreground">
          <ShieldCheck className="size-[13px]" aria-hidden="true" />
          Veilig betalen · ticket direct per e-mail
        </div>
      </div>
    </div>
  )
}
