import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

import { fetchSessionUser } from '#/server/session.ts'
import { Button } from '#/components/ui/button.tsx'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Ingelogde organisatoren horen in de app, niet op de landingspagina.
    const user = await fetchSessionUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: Home,
})

function Home() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-(--container-content) flex-col justify-center px-6 py-16"
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarDays aria-hidden="true" className="size-4" />
        Kalenda
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Evenementen en tickets voor Suriname
      </h1>
      <p className="mt-3 max-w-xl text-base text-muted-foreground">
        Publiceer je evenementen, verkoop tickets en verwerk betalingen — alles
        op één plek. Maak een account aan om te beginnen.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/register">Account aanmaken</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/login">Inloggen</Link>
        </Button>
      </div>
    </main>
  )
}
