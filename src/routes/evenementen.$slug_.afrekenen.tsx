import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { getCheckoutData } from '#/server/checkout.ts'
import { fetchSessionUser } from '#/server/session.ts'
import { decodeSelection } from '#/lib/selection.ts'
import { OrderFlow } from '#/components/public/order-flow.tsx'
import { Button } from '#/components/ui/button.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'

export const Route = createFileRoute('/evenementen/$slug_/afrekenen')({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === 'string' ? search.t : '',
  }),
  beforeLoad: async ({ location }) => {
    const user = await fetchSessionUser()
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user }
  },
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: async ({ params, deps }) => ({
    data: await getCheckoutData({
      data: { slug: params.slug, items: decodeSelection(deps.t) },
    }),
  }),
  head: () => ({
    meta: [{ title: 'Afrekenen · Kalenda' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  component: Checkout,
})

function Checkout() {
  const { slug } = Route.useParams()
  const { data } = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  if (!data || data.lines.length === 0) {
    return (
      <div className="storefront">
        <PublicHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6"
        >
          <h1 className="text-2xl font-semibold">Geen tickets geselecteerd</h1>
          <p className="mt-2 text-muted-foreground">
            Kies eerst je tickets op de eventpagina.
          </p>
          <Button asChild className="mt-6">
            <Link to="/evenementen/$slug" params={{ slug }}>
              Terug naar het evenement
            </Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="storefront">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-(--container-content) px-4 py-8 sm:px-6"
      >
        <Link
          to="/evenementen/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Terug naar {data.event.title}
        </Link>

        <div className="mt-4">
          <OrderFlow mode="new" slug={slug} data={data} user={user} />
        </div>
      </main>
    </div>
  )
}
