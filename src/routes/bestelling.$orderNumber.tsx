import { createFileRoute, Link } from '@tanstack/react-router'

import { getOrderByNumber } from '#/server/checkout.ts'
import { OrderFlow } from '#/components/public/order-flow.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'

export const Route = createFileRoute('/bestelling/$orderNumber')({
  validateSearch: (search: Record<string, unknown>): { nieuw?: boolean } => {
    const nieuw = search.nieuw === true || search.nieuw === 'true'
    return nieuw ? { nieuw: true } : {}
  },
  loader: async ({ params }) => ({
    order: await getOrderByNumber({
      data: { orderNumber: params.orderNumber },
    }),
  }),
  head: ({ params }) => ({
    meta: [{ title: `Bestelling ${params.orderNumber} · Kalenda` }],
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
  component: OrderStatusPage,
})

function OrderStatusPage() {
  const { order } = Route.useLoaderData()
  const { nieuw } = Route.useSearch()

  if (!order) {
    return (
      <div className="storefront">
        <PublicHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6"
        >
          <h1 className="text-2xl font-semibold">Bestelling niet gevonden</h1>
          <p className="mt-2 text-muted-foreground">
            Controleer de link uit je bevestigingsmail.
          </p>
          <Link
            to="/evenementen"
            className="mt-6 inline-block font-medium text-primary hover:underline"
          >
            Bekijk evenementen
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <OrderFlow mode="existing" order={order} justCreated={nieuw ?? false} />
      </main>
    </div>
  )
}
