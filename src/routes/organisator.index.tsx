import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarCheck, MessageCircleMore, QrCode } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import { PublicFooter } from '#/components/public/public-footer.tsx'

const VALUE_POINTS = [
  {
    icon: CalendarCheck,
    title: 'Zet je evenement online',
    body: 'Maak je organisatie aan, vul je event in en publiceer binnen enkele minuten.',
  },
  {
    icon: MessageCircleMore,
    title: 'Betaalverzoek via WhatsApp',
    body: 'Stuur een betaalverzoek en bevestig zelf wanneer een bezoeker heeft betaald.',
  },
  {
    icon: QrCode,
    title: 'Scan tickets bij de deur',
    body: 'Elke QR-code is uniek en wordt eenmalig gescand — geen dubbele check-ins.',
  },
]

/**
 * Ingang voor organisatoren. Registreren is niet langer synoniem met
 * organisator worden — dit is de plek waar bezoekers bewust kiezen om een
 * organisatie te starten. Bewust minimaal (§2 CLAUDE.md): geen prijstabel,
 * geen features-marketing, dat is V2.
 */
export const Route = createFileRoute('/organisator/')({
  head: () => ({
    meta: [{ title: 'Word organisator · Kalenda' }],
  }),
  component: OrganisatorLanding,
})

function OrganisatorLanding() {
  const { user, organization } = Route.useRouteContext()

  return (
    <div className="storefront">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6"
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Word organisator op Kalenda
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Zet je evenement online, verkoop tickets en beheer je check-ins —
          gratis om te beginnen.
        </p>

        <ul className="mt-10 grid w-full gap-4 text-left sm:grid-cols-3">
          {VALUE_POINTS.map((point) => (
            <li
              key={point.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <point.icon className="size-5 text-primary" aria-hidden="true" />
              <div className="mt-3 font-semibold">{point.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {point.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3">
          {!user ? (
            <>
              <Button asChild size="lg" className="rounded-full">
                <Link
                  to="/register"
                  search={{ redirect: '/organisator/starten' }}
                >
                  Account aanmaken
                </Link>
              </Button>
              <Link
                to="/login"
                search={{ redirect: '/organisator/starten' }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ik heb al een account
              </Link>
            </>
          ) : !organization ? (
            <Button asChild size="lg" className="rounded-full">
              <Link to="/organisator/starten">Organisatie aanmaken</Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="rounded-full">
              <Link to="/dashboard">Naar je dashboard</Link>
            </Button>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
