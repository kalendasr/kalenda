import * as React from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react'

import { createOrder } from '#/server/checkout.ts'
import type { getCheckoutData, getOrderByNumber } from '#/server/checkout.ts'
import { submitProofOfPayment } from '#/server/payments.ts'
import { saveCustomerPushSubscription } from '#/server/notifications.ts'
import type { SavePushSubscriptionFn } from '#/hooks/use-push-subscription.ts'
import { usePushSubscription } from '#/hooks/use-push-subscription.ts'
import { checkoutClientSchema } from '#/lib/validation/checkout.ts'
import { signOut } from '#/lib/auth-client.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { formatSrd } from '#/lib/money.ts'
import {
  elapsedPercentage,
  formatDateTimeNl,
  formatRemaining,
} from '#/lib/datetime.ts'
import { deriveOrderFlowStep } from '#/lib/order-flow-step.ts'
import type { OrderStatus } from '#/lib/order-status.ts'
import { waLink } from '#/lib/whatsapp.ts'
import { cn } from '#/lib/utils.ts'
import { TicketQr } from '#/components/public/ticket-qr.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'
import { Alert, AlertDescription } from '#/components/ui/alert.tsx'
import { toast } from '#/components/ui/sonner.tsx'
import { errorMessage } from '#/lib/error-message.ts'

/**
 * Gedeelde ticketaanvraag- en orderstatusflow (SCREENS §4.3), gerenderd door
 * zowel `/evenementen/$slug/afrekenen` (nog geen order) als
 * `/bestelling/$orderNumber` (bestaande order — de vaste, loginloze link uit
 * de bevestigingsmail, BR-403/404, mag niet veranderen). Eén visuele taal en
 * stap-logica voor beide, aangedreven door echte orderstatus (BR-505) in
 * plaats van lokale demo-state.
 */

type CheckoutData = NonNullable<Awaited<ReturnType<typeof getCheckoutData>>>
type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>

const POLL_INTERVAL_MS = 20_000
const TICK_INTERVAL_MS = 30_000

/** Navy uit het ontwerp; er is geen storefront-token voor deze headerkleur. */
const NAVY = 'bg-[#0F172A]'
/** WhatsApp-merkgroen — wijkt bewust af van --success. */
const WHATSAPP_GROEN = 'bg-[#16A34A] hover:bg-[#15803D]'
const CARD =
  'rounded-[14px] border bg-card shadow-[0_22px_50px_-34px_rgba(11,18,32,0.4)]'

type SessionUserInfo = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
}

export type OrderFlowProps =
  | { mode: 'new'; slug: string; data: CheckoutData; user: SessionUserInfo }
  | { mode: 'existing'; order: OrderDetail; justCreated: boolean }

export function OrderFlow(props: OrderFlowProps) {
  if (props.mode === 'new') {
    return (
      <NewOrderForm slug={props.slug} data={props.data} user={props.user} />
    )
  }
  return (
    <ExistingOrderView order={props.order} justCreated={props.justCreated} />
  )
}

// ---------------------------------------------------------------------------
// Scherm 1 — nog geen order: het aanvraagformulier
// ---------------------------------------------------------------------------

function NewOrderForm({
  slug,
  data,
  user,
}: {
  slug: string
  data: CheckoutData
  user: SessionUserInfo
}) {
  const navigate = useNavigate()

  const methods: Array<'WhatsApp' | 'BankTransfer'> = [
    ...(data.payment.whatsappEnabled ? (['WhatsApp'] as const) : []),
    ...(data.payment.bankEnabled ? (['BankTransfer'] as const) : []),
  ]

  const form = useZodForm({
    schema: checkoutClientSchema,
    initialValues: {
      phone: user.phone ?? '',
      paymentMethod: methods[0] ?? 'WhatsApp',
      paymentApp: data.payment.whatsappApps[0],
      items: data.lines.map((line) => ({
        ticketTypeId: line.ticketTypeId,
        quantity: line.quantity,
      })),
    },
    onSubmit: async (values) => {
      const order = await createOrder({ data: { ...values, slug } })
      await navigate({
        to: '/bestelling/$orderNumber',
        params: { orderNumber: order.orderNumber },
        search: { nieuw: true },
      })
    },
  })

  const clamped = data.lines.filter(
    (line) => line.requestedQuantity > line.quantity,
  )

  const submitLabel = form.isSubmitting
    ? 'Bezig…'
    : form.values.paymentMethod === 'WhatsApp'
      ? 'Vraag je betaalverzoek aan'
      : 'Ontvang de bankgegevens'

  return (
    <div className="mx-auto w-full max-w-(--container-content)">
      <h1 className="text-2xl font-extrabold tracking-tight">Je aanvraag</h1>
      <p className="mt-1 text-muted-foreground">{data.event.title}</p>

      <form
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"
        onSubmit={form.handleSubmit}
      >
        <div className="flex flex-col gap-6">
          <FormError message={form.formError} />

          {clamped.length > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                We hebben je aantal aangepast — sommige tickets zijn intussen
                uitverkocht:{' '}
                {clamped
                  .map((line) => `${line.name} (${line.quantity}×)`)
                  .join(', ')}
                .
              </AlertDescription>
            </Alert>
          ) : null}

          <section className={CARD}>
            <div className="border-b px-5 py-[18px]">
              <h2 className="text-[17px] font-extrabold tracking-tight">
                Jouw gegevens
              </h2>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex items-start justify-between gap-3 rounded-[14px] bg-muted px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => window.location.reload(),
                      },
                    })
                  }
                >
                  Niet jou? Uitloggen
                </button>
              </div>
              <FormField
                id="phone"
                label="Telefoonnummer"
                required
                hint="Voor WhatsApp-contact over je betaling."
                error={form.errorFor('phone')}
              >
                {(aria) => (
                  <Input
                    {...aria}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+597 …"
                    value={form.values.phone}
                    onChange={(e) => form.setValue('phone', e.target.value)}
                    onBlur={() => form.handleBlur('phone')}
                  />
                )}
              </FormField>
            </div>
          </section>

          <section className={CARD}>
            <div className="border-b px-5 py-[18px]">
              <h2 className="text-[17px] font-extrabold tracking-tight">
                Hoe wil je betalen?
              </h2>
            </div>
            <div className="flex flex-col gap-3 px-5 py-5">
              {methods.map((method) => (
                <OptionRow
                  key={method}
                  name="paymentMethod"
                  checked={form.values.paymentMethod === method}
                  onSelect={() => form.setValue('paymentMethod', method)}
                  icoon={
                    method === 'WhatsApp' ? (
                      <MessageCircle className="size-[18px]" />
                    ) : (
                      <Building2 className="size-[18px]" />
                    )
                  }
                  title={
                    method === 'WhatsApp'
                      ? 'Betaalverzoek via WhatsApp'
                      : 'Bankoverschrijving'
                  }
                  description={
                    method === 'WhatsApp'
                      ? 'De organisator stuurt je een betaalverzoek.'
                      : 'Maak het bedrag over en upload je betaalbewijs.'
                  }
                />
              ))}

              {form.values.paymentMethod === 'WhatsApp' &&
              data.payment.whatsappApps.length > 0 ? (
                <fieldset className="min-w-0 rounded-[14px] bg-muted px-3.5 py-3">
                  <legend className="text-[12.5px] font-semibold text-muted-foreground">
                    Met welke app betaal je?
                  </legend>
                  <div className="mt-2 flex gap-2">
                    {data.payment.whatsappApps.map((app) => (
                      <button
                        key={app}
                        type="button"
                        aria-pressed={form.values.paymentApp === app}
                        onClick={() => form.setValue('paymentApp', app)}
                        className={cn(
                          'h-10 flex-1 cursor-pointer rounded-full border text-[14px] font-bold transition-colors',
                          form.values.paymentApp === app
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-card hover:bg-accent',
                        )}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  {form.errorFor('paymentApp') ? (
                    <p className="mt-2 text-[13px] font-medium text-destructive">
                      {form.errorFor('paymentApp')}
                    </p>
                  ) : null}
                </fieldset>
              ) : null}

              <div
                aria-disabled="true"
                className="flex items-start gap-3 rounded-[14px] border border-dashed p-3.5 opacity-60"
              >
                <Sparkles
                  className="mt-0.5 size-[18px] text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <span className="text-[14.5px] font-bold tracking-tight">
                    Direct online betalen
                  </span>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Binnenkort beschikbaar.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={CARD}>
            <div className="border-b px-5 py-[18px]">
              <h2 className="text-[17px] font-extrabold tracking-tight">
                Je bestelling
              </h2>
            </div>
            <div className="px-5 py-5">
              <ul className="flex flex-col gap-2">
                {data.lines.map((line) => (
                  <li
                    key={line.ticketTypeId}
                    className="flex justify-between gap-2 text-[13.5px]"
                  >
                    <span>
                      {line.quantity}× {line.name}
                    </span>
                    <span className="tabular-nums">
                      {formatSrd(line.totalPriceCents)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 text-[15px] font-extrabold">
                <span>Totaal</span>
                <span className="tabular-nums">
                  {formatSrd(data.subtotalCents)}
                </span>
              </div>

              <Button
                type="submit"
                disabled={form.isSubmitting || methods.length === 0}
                className="mt-4 h-[52px] w-full rounded-full text-[15.5px] font-extrabold"
              >
                {submitLabel}
              </Button>
              <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
                Je betaalt rechtstreeks aan de organisator.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}

function OptionRow({
  name,
  checked,
  onSelect,
  icoon,
  title,
  description,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  icoon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 accent-primary"
      />
      <span
        className={cn(
          'mt-0.5 shrink-0',
          checked ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      >
        {icoon}
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold tracking-tight">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Schermen 2-4 — bestaande order: bevestigd/wacht, betaald, verlopen
// ---------------------------------------------------------------------------

function ExistingOrderView({
  order,
  justCreated: initialJustCreated,
}: {
  order: OrderDetail
  justCreated: boolean
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [justCreated] = React.useState(initialJustCreated)
  const [now, setNow] = React.useState(() => new Date())
  const [herinneringVerstuurd, setHerinneringVerstuurd] = React.useState(false)
  const [gekopieerd, setGekopieerd] = React.useState(false)

  const { screen, activeStep, status, paymentRequestedAt } =
    deriveOrderFlowStep(
      { ...order, paymentRequestedAt: order.payment?.requestedAt ?? null },
      now,
    )

  React.useEffect(() => {
    if (!initialJustCreated) return
    void navigate({
      to: '/bestelling/$orderNumber',
      params: { orderNumber: order.orderNumber },
      search: {},
      replace: true,
    })
    // Alleen bij mount stripn — dit is een eenmalige URL-opschoning, geen
    // reactie op latere wijzigingen.
  }, [])

  // Live klok voor de teller/voortgangsbalk, en lichte polling zodat een
  // klant die wacht op organisatorgoedkeuring niet handmatig hoeft te
  // verversen om het ticketscherm te zien verschijnen.
  React.useEffect(() => {
    if (screen !== 'wacht') return
    const tick = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS)
    return () => clearInterval(tick)
  }, [screen])

  React.useEffect(() => {
    if (screen !== 'wacht') return
    const poll = setInterval(() => {
      void router.invalidate()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [screen, router])

  async function kopieerBankgegevens() {
    const bank = order.event.organization.paymentSettings
    const regels = [
      bank?.bankName,
      bank?.accountNumber,
      bank?.accountHolder,
      `Kenmerk ${order.orderNumber}`,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(regels)
      setGekopieerd(true)
    } catch {
      // Clipboard geweigerd: de gegevens staan hierboven al leesbaar in beeld.
    }
  }

  if (screen === 'verlopen') {
    return <ExpiredScreen order={order} status={status} />
  }
  if (screen === 'betaald') {
    return <PaidScreen order={order} />
  }
  return (
    <WaitingScreen
      order={order}
      activeStep={activeStep}
      justCreated={justCreated}
      paymentRequestedAt={paymentRequestedAt}
      now={now}
      herinneringVerstuurd={herinneringVerstuurd}
      onHerinnering={() => setHerinneringVerstuurd(true)}
      gekopieerd={gekopieerd}
      onKopieer={kopieerBankgegevens}
    />
  )
}

function timelineSteps(method: 'WhatsApp' | 'BankTransfer') {
  return [
    'Je aanvraag is ontvangen',
    method === 'WhatsApp'
      ? 'De organisator stuurt je een betaalverzoek'
      : 'De bankgegevens staan voor je klaar',
    'De organisator controleert je betaling',
    'Je ticket met QR-code wordt verstuurd',
  ]
}

function waitingCopy(
  justCreated: boolean,
  method: 'WhatsApp' | 'BankTransfer',
  activeStep: number,
  paymentRequestedAt: Date | null,
) {
  if (method === 'WhatsApp' && paymentRequestedAt) {
    return {
      titel: 'Je betaalverzoek staat klaar',
      subtekst: `Verstuurd op ${formatDateTimeNl(paymentRequestedAt)}. Zodra je betaalt, bevestigt de organisator het.`,
      chip: 'Betaalverzoek verstuurd',
    }
  }
  if (justCreated) {
    return {
      titel: 'Je aanvraag staat klaar',
      subtekst:
        method === 'WhatsApp'
          ? 'De organisator stuurt je een betaalverzoek via WhatsApp.'
          : 'Maak het bedrag over en de organisator doet de rest.',
      chip: 'Wacht op betaling',
    }
  }
  if (activeStep === 2) {
    return {
      titel: 'We controleren je betaling',
      subtekst:
        'De organisator bekijkt je betaalbewijs. Dit duurt meestal niet lang.',
      chip: 'Wacht op controle',
    }
  }
  return {
    titel: 'We wachten op je betaling',
    subtekst:
      method === 'WhatsApp'
        ? 'De organisator stuurt je zo een betaalverzoek via WhatsApp.'
        : 'Zodra je overmaakt, controleert de organisator de bijschrijving.',
    chip: 'Betaling nog niet ontvangen',
  }
}

function WaitingScreen({
  order,
  activeStep,
  justCreated,
  paymentRequestedAt,
  now,
  herinneringVerstuurd,
  onHerinnering,
  gekopieerd,
  onKopieer,
}: {
  order: OrderDetail
  activeStep: number
  justCreated: boolean
  paymentRequestedAt: Date | null
  now: Date
  herinneringVerstuurd: boolean
  onHerinnering: () => void
  gekopieerd: boolean
  onKopieer: () => void
}) {
  const org = order.event.organization
  const bank = org.paymentSettings
  const copy = waitingCopy(
    justCreated,
    order.paymentMethod,
    activeStep,
    paymentRequestedAt,
  )
  const steps = timelineSteps(order.paymentMethod)
  const progress = elapsedPercentage(order.createdAt, order.expiresAt, now)

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className={cn('overflow-hidden', CARD)}>
        <div className={cn('px-5 py-6 text-white', NAVY)}>
          <span className="grid size-11 place-items-center rounded-full bg-white/10">
            {justCreated ? (
              <CheckCircle2 className="size-[22px]" aria-hidden="true" />
            ) : (
              <Clock className="size-[22px]" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-3.5 text-[20px] font-extrabold tracking-tight">
            {copy.titel}
          </h1>
          <p className="mt-1.5 text-[14px] text-white/70">{copy.subtekst}</p>
        </div>

        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-warning px-3 py-1.5 text-[11.5px] font-bold text-warning-foreground uppercase">
              {copy.chip}
            </span>
            <span className="text-[14px] font-extrabold tabular-nums">
              {formatRemaining(order.expiresAt, now)}
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Nog ${formatRemaining(order.expiresAt, now)} om te betalen`}
          >
            <div
              className="h-full rounded-full bg-[#F59E0B]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Je aanvraag vervalt {formatDateTimeNl(order.expiresAt)}
          </p>
        </div>

        <div className="border-b px-5 py-5">
          <h2 className="text-[15px] font-extrabold tracking-tight">
            Wat gebeurt er nu?
          </h2>
          <ol className="mt-3.5 space-y-0">
            {steps.map((regel, i) => {
              const klaar = i < activeStep
              const actief = i === activeStep
              return (
                <li key={regel} className="flex gap-3">
                  <div
                    className="flex w-4 flex-col items-center"
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        'mt-1 grid size-4 shrink-0 place-items-center rounded-full',
                        klaar
                          ? 'bg-primary'
                          : actief
                            ? 'bg-[#F59E0B]'
                            : 'border-2 border-border bg-card',
                      )}
                    >
                      {klaar ? (
                        <Check
                          className="size-2.5 text-primary-foreground"
                          strokeWidth={3.5}
                        />
                      ) : null}
                    </span>
                    {i < steps.length - 1 ? (
                      <span
                        className={cn(
                          'w-0.5 flex-1',
                          klaar ? 'bg-primary' : 'bg-border',
                        )}
                      />
                    ) : null}
                  </div>
                  <div
                    className={cn('min-w-0', i < steps.length - 1 && 'pb-4')}
                  >
                    <span
                      className={cn(
                        'text-[14px]',
                        actief
                          ? 'font-bold text-foreground'
                          : klaar
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {regel}
                    </span>
                    {klaar || actief ? (
                      <span className="mt-0.5 block text-[12px] font-semibold text-muted-foreground uppercase">
                        {klaar ? 'klaar' : 'nu bezig'}
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="px-5 py-5">
          {order.paymentMethod === 'WhatsApp' ? (
            <WhatsAppBlock
              order={order}
              phone={org.paymentSettings?.whatsappPhone ?? org.phone}
              herinneringVerstuurd={herinneringVerstuurd}
              onHerinnering={onHerinnering}
            />
          ) : (
            <BankBlock
              order={order}
              bank={bank}
              gekopieerd={gekopieerd}
              onKopieer={onKopieer}
            />
          )}
        </div>
      </div>

      <OrderSummaryCard order={order} />
      <PushOptInCard orderNumber={order.orderNumber} />

      <p className="mt-4 text-center text-[12px] text-muted-foreground">
        Bewaar deze pagina — je hebt geen account nodig om je bestelling te
        bekijken.
      </p>
    </div>
  )
}

function WhatsAppBlock({
  order,
  phone,
  herinneringVerstuurd,
  onHerinnering,
}: {
  order: OrderDetail
  phone: string | null
  herinneringVerstuurd: boolean
  onHerinnering: () => void
}) {
  const openLink = waLink(
    phone,
    `Hoi, ik heb een aanvraag geplaatst voor ${order.event.title} (kenmerk ${order.orderNumber}).`,
  )
  const herinneringLink = waLink(
    phone,
    `Hoi, een korte herinnering over mijn betaalverzoek voor ${order.event.title} (kenmerk ${order.orderNumber}).`,
  )

  return (
    <>
      <h2 className="text-[15px] font-extrabold tracking-tight">
        Zo betaal je
      </h2>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">
        Je krijgt het betaalverzoek binnen enkele minuten binnen. Vermeld altijd
        je kenmerk.
      </p>

      <dl className="mt-4 rounded-[14px] bg-muted px-4 py-3.5 text-[14px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Betaalapp</dt>
          <dd className="font-bold">{order.paymentApp ?? '—'}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Kenmerk</dt>
          <dd className="font-mono font-bold">{order.orderNumber}</dd>
        </div>
      </dl>

      {openLink ? (
        <Button
          asChild
          className={cn(
            'mt-4 h-[52px] w-full rounded-full text-[15px] font-extrabold text-white',
            WHATSAPP_GROEN,
          )}
        >
          <a href={openLink} target="_blank" rel="noreferrer">
            <MessageCircle className="size-[18px]" aria-hidden="true" />
            Open gesprek met organisator
          </a>
        </Button>
      ) : (
        <p className="mt-4 text-[13.5px] text-muted-foreground">
          De organisator stuurt je een betaalverzoek
          {order.paymentApp ? ` via ${order.paymentApp}` : ''}.
        </p>
      )}

      {herinneringLink ? (
        <Button
          asChild
          variant="outline"
          onClick={onHerinnering}
          className="mt-2.5 h-[52px] w-full rounded-full text-[15px] font-bold"
        >
          <a href={herinneringLink} target="_blank" rel="noreferrer">
            <span aria-live="polite">
              {herinneringVerstuurd
                ? 'Herinnering verstuurd ✓'
                : 'Stuur een herinnering'}
            </span>
          </a>
        </Button>
      ) : null}
    </>
  )
}

type BankSettings = OrderDetail['event']['organization']['paymentSettings']

function BankBlock({
  order,
  bank,
  gekopieerd,
  onKopieer,
}: {
  order: OrderDetail
  bank: BankSettings
  gekopieerd: boolean
  onKopieer: () => void
}) {
  return (
    <>
      <h2 className="text-[15px] font-extrabold tracking-tight">
        Maak het bedrag over
      </h2>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">
        Gebruik je kenmerk als omschrijving, dan herkent de organisator je
        betaling meteen.
      </p>

      <dl className="mt-4 rounded-[14px] bg-muted px-4 py-3.5 text-[14px]">
        {bank?.bankName ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Bank</dt>
            <dd className="font-bold">{bank.bankName}</dd>
          </div>
        ) : null}
        {bank?.accountNumber ? (
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Rekeningnummer</dt>
            <dd className="font-mono font-bold">{bank.accountNumber}</dd>
          </div>
        ) : null}
        {bank?.accountHolder ? (
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Ten name van</dt>
            <dd className="font-bold">{bank.accountHolder}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Kenmerk</dt>
          <dd className="font-mono font-bold">{order.orderNumber}</dd>
        </div>
      </dl>
      {bank?.paymentInstructions ? (
        <p className="mt-2 text-[13px] whitespace-pre-line text-muted-foreground">
          {bank.paymentInstructions}
        </p>
      ) : null}

      <Button
        variant="outline"
        onClick={onKopieer}
        className="mt-4 h-[52px] w-full rounded-full text-[15px] font-bold"
      >
        <Copy className="size-[17px]" aria-hidden="true" />
        <span aria-live="polite">
          {gekopieerd
            ? 'Betaalgegevens gekopieerd ✓'
            : 'Kopieer betaalgegevens'}
        </span>
      </Button>

      <BankProofUpload
        orderNumber={order.orderNumber}
        paymentState={order.payment?.state ?? 'Waiting'}
        paymentNotes={order.payment?.notes ?? null}
      />
    </>
  )
}

function BankProofUpload({
  orderNumber,
  paymentState,
  paymentNotes,
}: {
  orderNumber: string
  paymentState: string
  paymentNotes: string | null
}) {
  const router = useRouter()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [reference, setReference] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)

  const isSubmitted = paymentState === 'Submitted'
  const isRejected = paymentState === 'Rejected'

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('Kies eerst een betaalbewijs (PNG, JPG of WebP).')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('orderNumber', orderNumber)
    if (reference.trim()) formData.append('reference', reference.trim())

    setUploading(true)
    try {
      await submitProofOfPayment({ data: formData })
      toast.success('Je betaalbewijs is ontvangen.')
      await router.invalidate()
    } catch (error) {
      toast.error(
        errorMessage(error, 'Uploaden is niet gelukt. Probeer het opnieuw.'),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 rounded-[14px] border p-4">
      {isSubmitted ? (
        <Alert variant="info">
          <Clock />
          <AlertDescription>
            We hebben je betaalbewijs ontvangen. Zodra de organisator het heeft
            gecontroleerd, ontvang je je tickets per e-mail.
          </AlertDescription>
        </Alert>
      ) : null}

      {isRejected ? (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>
            {paymentNotes
              ? `De organisator gaf als reden: "${paymentNotes}". `
              : 'De organisator heeft je betaalbewijs niet goedgekeurd. '}
            Je kunt hieronder een nieuw betaalbewijs uploaden.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isSubmitted ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-bold text-foreground">
            Betaalbewijs uploaden
          </p>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Betalingsreferentie (optioneel)"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={() =>
              setFileName(fileRef.current?.files?.[0]?.name ?? null)
            }
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {fileName ?? 'Kies een afbeelding'}
          </Button>
          <Button type="button" disabled={uploading} onClick={handleUpload}>
            {uploading
              ? 'Bezig met uploaden…'
              : isRejected
                ? 'Opnieuw uploaden'
                : 'Ik heb overgemaakt'}
          </Button>
          <p className="text-[12px] text-muted-foreground">
            Upload een foto of scan van je overschrijving (max. 5 MB,
            PNG/JPG/WebP).
          </p>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Uitnodiging om pushmeldingen aan te zetten voor déze bestelling (klant,
 * publiek/loginloos — vandaar de gebonden `saveCustomerPushSubscription` met
 * het ordernummer als sleutel, net als het indienen van een betaalbewijs).
 * Verschijnt zowel tijdens het wachten (voor de "tickets klaar"-melding) als
 * na betaling (voor de "ingecheckt"-melding aan de deur). Blijft onzichtbaar
 * in toestanden waarin de klant toch niets kan doen (geblokkeerd, niet
 * ondersteund, nog aan het laden) — geen technische uitleg die hier niet
 * relevant is.
 */
function PushOptInCard({ orderNumber }: { orderNumber: string }) {
  const saveFn: SavePushSubscriptionFn = React.useCallback(
    (input) =>
      saveCustomerPushSubscription({
        data: { ...input.data, orderNumber },
      }),
    [orderNumber],
  )
  const { state, subscribe } = usePushSubscription(saveFn)

  if (state === 'checking' || state === 'unsupported' || state === 'denied') {
    return null
  }

  return (
    <div className={cn('mt-4 flex items-center gap-3 px-5 py-4', CARD)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Bell className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {state === 'subscribed' ? (
          <p className="text-[13.5px] font-medium">
            Je krijgt een melding op dit apparaat.
          </p>
        ) : state === 'ios-needs-install' ? (
          <>
            <p className="text-[13.5px] font-medium">Meldingen op je iPhone</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Tik op <strong>Deel</strong> → <strong>Zet op beginscherm</strong>{' '}
              en open de link daarna vanaf je beginscherm.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] font-medium">
            Zet meldingen aan voor deze bestelling
          </p>
        )}
      </div>
      {state === 'prompt' && (
        <Button size="sm" variant="outline" onClick={subscribe}>
          Aanzetten
        </Button>
      )}
      {state === 'busy' && (
        <span className="shrink-0 text-[12.5px] text-muted-foreground">
          Bezig…
        </span>
      )}
    </div>
  )
}

function OrderSummaryCard({ order }: { order: OrderDetail }) {
  return (
    <div className={cn('mt-4 overflow-hidden', CARD)}>
      <div className="border-b px-5 py-4">
        <h2 className="text-[15px] font-extrabold tracking-tight">
          {order.event.title}
        </h2>
        <div className="mt-1.5 flex flex-col gap-1 text-[13px] text-muted-foreground">
          {order.event.startsAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDateTimeNl(order.event.startsAt)}
            </span>
          ) : null}
          {order.event.venue ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {[order.event.venue.name, order.event.venue.district]
                .filter(Boolean)
                .join(', ')}
            </span>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-4">
        <ul className="flex flex-col gap-1.5">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-2 text-[13.5px]"
            >
              <span>
                {item.quantity}× {item.ticketType.name}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 text-[14.5px] font-extrabold">
          <span>Totaal</span>
          <span className="tabular-nums">{formatSrd(order.totalCents)}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scherm — betaald
// ---------------------------------------------------------------------------

function PaidScreen({ order }: { order: OrderDetail }) {
  const allTickets = order.items.flatMap((item) =>
    item.tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketTypeName: item.ticketType.name,
      sentAt: ticket.sentAt,
    })),
  )
  const lastSentAt = allTickets.reduce<Date | null>((latest, ticket) => {
    if (!ticket.sentAt) return latest
    if (!latest || ticket.sentAt > latest) return ticket.sentAt
    return latest
  }, null)

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className={cn('overflow-hidden', CARD)}>
        <div className={cn('px-5 py-6 text-white', NAVY)}>
          <span className="grid size-11 place-items-center rounded-full bg-white/10 text-[22px]">
            <span aria-hidden="true">🎫</span>
          </span>
          <h1 className="mt-3.5 text-[20px] font-extrabold tracking-tight">
            {allTickets.length === 1
              ? 'Je ticket is onderweg'
              : 'Je tickets zijn onderweg'}
          </h1>
          <p className="mt-1.5 text-[14px] text-white/70">
            De organisator heeft je betaling bevestigd.
          </p>
        </div>

        <div className="px-5 py-6">
          {allTickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <QrCode
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-[13.5px] text-muted-foreground">
                Je tickets worden aangemaakt. Kom over een paar minuten terug,
                of je ontvangt ze per e-mail.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {allTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-4 rounded-[14px] border p-4"
                >
                  <TicketQr
                    ticketNumber={ticket.ticketNumber}
                    baseUrl={order.baseUrl}
                    size={120}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold">
                      {ticket.ticketTypeName}
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-muted-foreground">
                      {ticket.ticketNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
            Toon je QR-code bij de ingang. Je tickets zijn ook naar{' '}
            {order.customer.email} gemaild
            {lastSentAt ? ` op ${formatDateTimeNl(lastSentAt)}` : ''}.
          </p>
        </div>
      </div>

      <OrderSummaryCard order={order} />
      <PushOptInCard orderNumber={order.orderNumber} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scherm — verlopen / geannuleerd
// ---------------------------------------------------------------------------

function ExpiredScreen({
  order,
  status,
}: {
  order: OrderDetail
  status: OrderStatus
}) {
  const titel =
    status === 'Cancelled'
      ? 'Deze aanvraag is geannuleerd'
      : 'Deze aanvraag is verlopen'
  const subtekst =
    status === 'Cancelled'
      ? 'De organisator heeft deze bestelling geannuleerd.'
      : 'De betaaltermijn is verstreken en de tickets zijn weer vrijgegeven.'

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className={cn('overflow-hidden', CARD)}>
        <div className={cn('px-5 py-6 text-white', NAVY)}>
          <span className="grid size-11 place-items-center rounded-full bg-white/10">
            <TriangleAlert className="size-[22px]" aria-hidden="true" />
          </span>
          <h1 className="mt-3.5 text-[20px] font-extrabold tracking-tight">
            {titel}
          </h1>
          <p className="mt-1.5 text-[14px] text-white/70">{subtekst}</p>
        </div>

        <div className="px-5 py-6 text-center">
          <p className="text-[13.5px] text-muted-foreground">
            Bestelnummer{' '}
            <span className="font-mono font-bold text-foreground">
              {order.orderNumber}
            </span>
          </p>
          <Button
            asChild
            className="mt-5 h-[52px] w-full rounded-full text-[15.5px] font-extrabold"
          >
            <Link to="/evenementen/$slug" params={{ slug: order.event.slug }}>
              Plaats een nieuwe aanvraag
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
