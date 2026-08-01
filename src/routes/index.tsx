import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

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
        Het platform is opgezet. De eerste werkende workflow — registreren,
        inloggen en een organisatie beheren — volgt in fase 1.
      </p>
    </main>
  )
}
