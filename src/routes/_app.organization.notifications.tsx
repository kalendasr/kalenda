import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Bell, BellOff, Laptop2, RefreshCw, Trash2 } from 'lucide-react'

import {
  deletePushDevice,
  getMyNotificationPreferences,
  listMyPushDevices,
  sendTestPush,
  setNotificationPreference,
} from '#/server/notifications.ts'
import { usePushSubscription } from '#/hooks/use-push-subscription.ts'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { toast } from '#/components/ui/sonner.tsx'
import { ConfirmDialog } from '#/components/app/confirm-dialog.tsx'

export const Route = createFileRoute('/_app/organization/notifications')({
  loader: async () => ({
    devices: await listMyPushDevices(),
    preferences: await getMyNotificationPreferences(),
  }),
  component: OrganizationNotifications,
})

/** Relatiefformat voor lastSeenAt. Eenvoudig en taalspecifiek. */
function relativeSeen(date: Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (secs < 60) return 'zojuist'
  if (mins < 60) return `${mins} min. geleden`
  if (hours < 24) return `${hours} u. geleden`
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`
  return new Date(date).toLocaleDateString('nl', {
    day: 'numeric',
    month: 'long',
  })
}

function OrganizationNotifications() {
  const { devices, preferences } = Route.useLoaderData()
  const router = useRouter()

  // Huidige endpoint: we lezen het uit de actieve ServiceWorker-subscription.
  const [localEndpoint, setLocalEndpoint] = useState<string | null>(null)
  const { state, subscribe: subscribeRaw } = usePushSubscription()

  // Nadat de hook een 'subscribed'-toestand bereikt, de lijst verversen en het
  // locale endpoint achterhalen zodat we "Dit apparaat" kunnen labelen.
  const subscribe = async () => {
    await subscribeRaw()
    await router.invalidate()
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) setLocalEndpoint(sub.endpoint)
    } catch {
      // Niet kritiek: de badge verschijnt dan gewoon niet.
    }
  }

  // Endpoint ophalen zodra we weten dat we geabonneerd zijn.
  useEffect(() => {
    if (state !== 'subscribed') return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setLocalEndpoint(sub.endpoint)
      })
      .catch(() => {})
  }, [state])

  async function handleTest() {
    try {
      const { delivered } = await sendTestPush()
      if (delivered > 0) {
        toast.success(
          `Testmelding verzonden naar ${delivered} ${delivered === 1 ? 'apparaat' : 'apparaten'}.`,
        )
      } else {
        toast.warning(
          'Geen actieve apparaten gevonden. Zet meldingen eerst aan op dit apparaat.',
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Er is iets misgegaan.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePushDevice({ data: { id } })
      await router.invalidate()
      toast.success('Apparaat verwijderd.')
    } catch {
      toast.error('Kon het apparaat niet verwijderen.')
    }
  }

  async function handleToggle(type: string, enabled: boolean) {
    try {
      await setNotificationPreference({ data: { type, enabled } })
      await router.invalidate()
    } catch {
      toast.error('Kon de voorkeur niet opslaan.')
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* -- Aanzet-kaart -- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meldingen inschakelen</CardTitle>
          <CardDescription>
            Zet meldingen aan op de apparaten die je bij je hebt tijdens je
            evenement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state === 'subscribed' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Dit apparaat ontvangt meldingen.
              </p>
              <Button variant="outline" size="sm" onClick={handleTest}>
                <RefreshCw className="size-3.5" />
                Stuur een testmelding
              </Button>
            </div>
          )}

          {state === 'prompt' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Dit apparaat ontvangt nog geen meldingen.
              </p>
              <Button size="sm" onClick={subscribe}>
                <Bell className="size-3.5" />
                Meldingen aanzetten
              </Button>
            </div>
          )}

          {state === 'busy' && (
            <p className="text-sm text-muted-foreground">Toestemming vragen…</p>
          )}

          {state === 'denied' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <span className="block font-semibold">
                Meldingen zijn geblokkeerd
              </span>
              <span className="mt-1 block text-muted-foreground">
                Je browser heeft meldingen voor deze site geblokkeerd. Klik op
                het slotje of het informatie-icoon links in de adresbalk en sta
                meldingen toe. Daarna hoef je de pagina maar te verversen.
              </span>
            </div>
          )}

          {state === 'ios-needs-install' && (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <span className="block font-semibold">
                Meldingen op je iPhone
              </span>
              <span className="mt-1 block text-muted-foreground">
                Meldingen werken op iPhone alleen vanuit het beginscherm. Tik
                onderin op <strong>Deel</strong> →{' '}
                <strong>Zet op beginscherm</strong>. Open Kalenda daarna vanaf
                je beginscherm en zet meldingen hier aan.
              </span>
            </div>
          )}

          {state === 'unsupported' && (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <span className="block font-semibold">
                <BellOff className="mr-1.5 inline size-4 align-text-bottom" />
                Niet ondersteund door deze browser
              </span>
              <span className="mt-1 block text-muted-foreground">
                Web Push werkt niet in deze browser. Probeer Chrome of Firefox,
                of voeg de site toe aan je beginscherm op iPhone (iOS 16.4 of
                nieuwer).
              </span>
            </div>
          )}

          {state === 'checking' && (
            <p className="text-sm text-muted-foreground">Laden…</p>
          )}
        </CardContent>
      </Card>

      {/* -- Apparatenlijst -- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gekoppelde apparaten</CardTitle>
          <CardDescription>
            Apparaten die meldingen ontvangen voor jouw evenementen.
          </CardDescription>
        </CardHeader>
        {devices.length === 0 ? (
          <CardContent>
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Laptop2 className="mx-auto mb-2 size-7 opacity-40" />
              <p className="font-medium text-foreground">Nog geen apparaten</p>
              <p className="mt-1">
                Zet meldingen aan op de telefoon die je bij je hebt tijdens je
                evenement.
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col divide-y p-0">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <Laptop2 className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{device.label}</span>
                    {localEndpoint === device.endpoint && (
                      <Badge variant="secondary" className="py-0 text-[10px]">
                        Dit apparaat
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Actief {relativeSeen(device.lastSeenAt)}
                  </span>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Apparaat ${device.label} verwijderen`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  title="Apparaat verwijderen?"
                  description={`${device.label} ontvangt dan geen meldingen meer. Je kunt het altijd opnieuw koppelen.`}
                  confirmLabel="Verwijderen"
                  destructive
                  onConfirm={() => handleDelete(device.id)}
                />
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* -- Voorkeuren per type -- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meldingstypen</CardTitle>
          <CardDescription>
            Zet specifieke meldingen aan of uit. Klantmeldingen staan altijd
            aan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {preferences.map((pref) => (
            <div
              key={pref.key}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">
                  {pref.description}
                </p>
              </div>
              <Switch
                checked={pref.enabled}
                onCheckedChange={(enabled) => handleToggle(pref.key, enabled)}
                aria-label={`${pref.label} ${pref.enabled ? 'aan' : 'uit'}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
