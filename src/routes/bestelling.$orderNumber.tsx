import { createFileRoute, notFound } from '@tanstack/react-router'

import { getOrderByNumber } from '#/server/checkout.ts'
import { OrderFlow } from '#/components/public/order-flow.tsx'
import { PublicHeader } from '#/components/public/public-header.tsx'
import {
  AppErrorPage,
  StorefrontNotFound,
  StorefrontPendingState,
} from '#/components/app/full-page-states.tsx'

export const Route = createFileRoute('/bestelling/$orderNumber')({
  validateSearch: (search: Record<string, unknown>): { nieuw?: boolean } => {
    const nieuw = search.nieuw === true || search.nieuw === 'true'
    return nieuw ? { nieuw: true } : {}
  },
  loader: async ({ params }) => {
    const order = await getOrderByNumber({
      data: { orderNumber: params.orderNumber },
    })
    if (!order) throw notFound()
    return { order }
  },
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
  notFoundComponent: () => (
    <StorefrontNotFound
      title="Bestelling niet gevonden"
      description="Controleer de link uit je bevestigingsmail."
      linkLabel="Bekijk evenementen"
    />
  ),
  pendingComponent: () => <StorefrontPendingState cards={1} />,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage error={error} reset={reset} />
  ),
})

function OrderStatusPage() {
  const { order } = Route.useLoaderData()
  const { nieuw } = Route.useSearch()

  return (
    <div className="storefront">
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <OrderFlow mode="existing" order={order} justCreated={nieuw ?? false} />
      </main>
    </div>
  )
}
