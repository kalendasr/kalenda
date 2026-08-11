import { createFileRoute, notFound } from '@tanstack/react-router'

import { getTicketByNumber } from '#/server/tickets.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { cn } from '#/lib/utils.ts'
import { TicketQr } from '#/components/public/ticket-qr.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import {
  AppErrorPage,
  StorefrontNotFound,
  StorefrontPendingState,
} from '#/components/app/full-page-states.tsx'

/**
 * Publieke ticketpagina (Fase 9, BR-700/701/704).
 *
 * Dit is waar de QR-code op het ticket naartoe wijst (`ticketQrPayload`) — tot
 * nu toe bestond deze route niet, dus scannen met een gewone camera gaf een
 * 404. Ook de "bekijk ticket"-link in het orderdetail van de organisator
 * opent deze pagina. Geen login nodig: het ticketnummer is de sleutel.
 */

const CARD =
  'rounded-[14px] border bg-card shadow-[0_22px_50px_-34px_rgba(11,18,32,0.4)]'

export const Route = createFileRoute('/ticket/$ticketNumber')({
  loader: async ({ params }) => {
    const ticket = await getTicketByNumber({
      data: { ticketNumber: params.ticketNumber },
    })
    if (!ticket) throw notFound()
    return { ticket }
  },
  head: ({ params }) => ({
    meta: [{ title: `Ticket ${params.ticketNumber.slice(0, 8)} · Kalenda` }],
  }),
  component: TicketPage,
  notFoundComponent: () => (
    <StorefrontNotFound
      title="Ticket niet gevonden"
      description="Controleer de link of QR-code uit je ticketmail."
      linkLabel="Bekijk evenementen"
    />
  ),
  pendingComponent: () => <StorefrontPendingState cards={1} />,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage error={error} reset={reset} />
  ),
})

function TicketPage() {
  const { ticket } = Route.useLoaderData()

  const venue = [ticket.venueName, ticket.venueDistrict]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className={cn('overflow-hidden p-6', CARD)}>
          <span className="font-eyebrow text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            E-ticket
          </span>
          <h1 className="mt-1 text-[20px] font-extrabold tracking-tight">
            {ticket.eventTitle}
          </h1>
          {ticket.startsAt ? (
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {formatDateTimeNl(ticket.startsAt)}
              {venue ? ` · ${venue}` : ''}
            </p>
          ) : null}

          {ticket.status === 'CheckedIn' && ticket.checkedInAt ? (
            <p className="mt-4 rounded-[10px] bg-warning/10 px-3 py-2.5 text-center text-[13px] font-medium text-warning">
              Dit ticket is al gescand op {formatDateTimeNl(ticket.checkedInAt)}
              .
            </p>
          ) : null}
          {ticket.status === 'Cancelled' ? (
            <p className="mt-4 rounded-[10px] bg-destructive/10 px-3 py-2.5 text-center text-[13px] font-medium text-destructive">
              Dit ticket is ingetrokken en geeft geen toegang meer.
            </p>
          ) : null}

          <div className="mt-6 flex justify-center">
            <TicketQr
              ticketNumber={ticket.ticketNumber}
              baseUrl={ticket.baseUrl}
              size={220}
            />
          </div>

          <dl className="mt-6 flex flex-col gap-2 text-[14px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Naam</dt>
              <dd className="font-bold">{ticket.customerName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-bold">{ticket.ticketTypeName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-mono font-bold">
                {ticket.ticketNumber.slice(0, 8).toUpperCase()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Geen "typ de code hierboven in": handmatige check-in matcht het
            volledige ticketnummer, niet deze korte weergave. Aan de deur zoekt
            de organisator op deze code of op je naam. */}
        <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
          Laat deze QR-code scannen bij de ingang. Lukt scannen niet, noem dan
          de code hierboven of je naam — de organisator zoekt je ermee op. Tip:
          maak een screenshot, dan werkt je ticket ook zonder internet.
        </p>
      </main>
    </div>
  )
}
