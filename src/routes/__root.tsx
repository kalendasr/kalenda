import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '#/styles.css?url'
import { loadAppContext } from '#/server/app-context.ts'
import { Toaster } from '#/components/ui/sonner.tsx'
import {
  AppErrorPage,
  NotFoundPage,
} from '#/components/app/full-page-states.tsx'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { user, organization } = await loadAppContext()
    return { user, organization }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Kalenda' },
      {
        name: 'description',
        content: 'Evenementen en tickets voor Suriname.',
      },
      // PWA: kleur van de systeembalk + iOS-standalone-gedrag. iOS-pushmeldingen
      // werken alleen wanneer de site vanaf het beginscherm is geopend.
      { name: 'theme-color', content: '#3b4fd4' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Kalenda' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon-180.png' },
      { rel: 'icon', href: '/icons/icon-192.png', type: 'image/png' },
    ],
  }),
  shellComponent: RootDocument,
  // Vangnet voor onbekende URL's en voor fouten die geen enkele route zelf
  // afvangt; zonder deze twee valt de gebruiker terug op het kale scherm van
  // de router.
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage error={error} reset={reset} />
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only rounded-md bg-background px-4 py-2 text-foreground focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:ring-2 focus:ring-ring"
        >
          Naar hoofdinhoud
        </a>
        {children}
        <Toaster />
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
