import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'

/**
 * Knop die zichzelf blokkeert zolang de actie loopt.
 *
 * Nodig omdat de acties in het orderproces zichtbaar naar buiten werken: een
 * tweede klik op "Betaalverzoek versturen" of "Verstuur tickets" stuurt het
 * bericht een tweede keer naar de klant. Op een trage verbinding gebeurt dat
 * makkelijk, want zonder deze knop geeft het scherm geen enkel teken dat er
 * iets loopt.
 *
 * `pendingLabel` vertelt wat er gebeurt in plaats van alleen een spinner —
 * de gebruiker moet weten waarop hij wacht (CLAUDE.md §3).
 *
 * `onClick` blijft zelf verantwoordelijk voor de melding aan de gebruiker;
 * deze knop bepaalt alleen wanneer je hem wél en niet mag indrukken.
 */
export function AsyncButton({
  onClick,
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'onClick' | 'asChild'> & {
  onClick: () => Promise<unknown>
  pendingLabel: string
}) {
  const [pending, setPending] = React.useState(false)
  const mounted = React.useRef(true)

  React.useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function handleClick() {
    if (pending) return
    setPending(true)
    try {
      await onClick()
    } catch (error) {
      // De aanroeper toont zelf een toast; hier alleen loggen, zodat een
      // mislukte actie niet als stille unhandled rejection verdwijnt.
      console.error(error)
    } finally {
      // De actie kan de lijst opnieuw laden en deze knop laten verdwijnen;
      // dan mag er geen state meer gezet worden.
      if (mounted.current) setPending(false)
    }
  }

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={handleClick}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
