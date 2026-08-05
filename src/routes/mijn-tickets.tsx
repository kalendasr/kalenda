import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Ticket } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'

export const Route = createFileRoute('/mijn-tickets')({
  head: () => ({
    meta: [{ title: 'Mijn tickets · Kalenda' }],
  }),
  component: MijnTickets,
})

/**
 * Er is geen bezoekersaccount (BR-502: één klant per order, geen login).
 * Bestelnummers staan in de bevestigingsmail; deze pagina is een
 * lichtgewicht opzoekpunt naar `/bestelling/$orderNumber`.
 */
function MijnTickets() {
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = React.useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = orderNumber.trim()
    if (!trimmed) return
    navigate({
      to: '/bestelling/$orderNumber',
      params: { orderNumber: trimmed },
    })
  }

  return (
    <div className="storefront">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center sm:px-6"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Ticket className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Mijn tickets</h1>
        <p className="mt-2 text-muted-foreground">
          Vul je bestelnummer in om je tickets te bekijken. Je vindt het terug
          in de bevestigingsmail van je bestelling.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex w-full flex-col gap-3"
        >
          <div className="text-left">
            <Label htmlFor="order-number">Bestelnummer</Label>
            <Input
              id="order-number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Bijv. OYF-4821"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={orderNumber.trim() === ''}>
            Bekijk mijn tickets
          </Button>
        </form>
      </main>
      <PublicFooter />
    </div>
  )
}
