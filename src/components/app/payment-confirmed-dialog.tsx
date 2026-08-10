import { useState } from 'react'
import { Check, MessageCircle, Send } from 'lucide-react'

import type { ApprovePaymentResult } from '#/server/payments.ts'
import { formatDateTimeNl } from '#/lib/datetime.ts'
import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Separator } from '#/components/ui/separator.tsx'
import { CustomerPushForm } from '#/components/app/customer-push-form.tsx'

/** WhatsApp-merkgroen — wijkt bewust af van --success (zie order-flow.tsx). */
const WHATSAPP_GROEN = 'bg-[#16A34A] hover:bg-[#15803D]'

/**
 * Verschijnt direct nadat de organisator een betaling heeft bevestigd
 * (Fase 10). Vervangt de kale toast door een overzicht van wat er automatisch
 * is gebeurd (tickets, mail, push) plus twee directe vervolgacties — de
 * tickets ook via WhatsApp appen en/of een eigen bericht sturen — zodat de
 * organisator dat niet via een aparte weg in het orderdetail hoeft te zoeken.
 */
export function PaymentConfirmedDialog({
  result,
  open,
  onOpenChange,
  onResendEmail,
  onSendPush,
  onWhatsAppOpened,
}: {
  result: ApprovePaymentResult
  open: boolean
  onOpenChange: (open: boolean) => void
  onResendEmail: () => Promise<void>
  onSendPush: (title: string, body: string) => Promise<number>
  onWhatsAppOpened: () => void
}) {
  const [resending, setResending] = useState(false)
  const [whatsappOpened, setWhatsappOpened] = useState(false)

  async function resend() {
    setResending(true)
    try {
      await onResendEmail()
    } finally {
      setResending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Betaling bevestigd</DialogTitle>
          <DialogDescription>
            {result.customerFirstName} · {result.ticketCount} ticket
            {result.ticketCount === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ul className="flex flex-col gap-3">
          <StatusRow
            done
            label={`Tickets aangemaakt — ${result.ticketCount}`}
          />
          {result.email.sentAt ? (
            <StatusRow
              done
              label={`Ticketmail verstuurd naar ${result.email.to}`}
              detail={formatDateTimeNl(result.email.sentAt)}
            />
          ) : (
            <li className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-warning">
                  Mailen is niet gelukt
                </div>
                <div className="text-xs text-muted-foreground">
                  De tickets staan klaar, maar de mail is nog niet aangekomen.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={resending}
                onClick={resend}
              >
                <Send />
                {resending ? 'Bezig…' : 'Opnieuw mailen'}
              </Button>
            </li>
          )}
          {result.push.delivered > 0 ? (
            <StatusRow
              done
              label={`Pushmelding verstuurd (${result.push.delivered} apparaat${result.push.delivered === 1 ? '' : 'en'})`}
            />
          ) : (
            <StatusRow label="Klant heeft geen meldingen aanstaan" muted />
          )}
        </ul>

        <Separator />

        {whatsappOpened ? (
          <Button disabled>
            <Check />
            Verstuurd
          </Button>
        ) : result.whatsappUrl ? (
          <Button asChild className={WHATSAPP_GROEN}>
            <a
              href={result.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                setWhatsappOpened(true)
                onWhatsAppOpened()
              }}
            >
              <MessageCircle />
              Stuur tickets via WhatsApp
            </a>
          </Button>
        ) : (
          <Button disabled variant="outline">
            <MessageCircle />
            Geen telefoonnummer bekend
          </Button>
        )}

        {result.push.devices > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Extra bericht sturen</h3>
            <CustomerPushForm onSend={onSendPush} />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Klaar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusRow({
  label,
  detail,
  done = false,
  muted = false,
}: {
  label: string
  detail?: string
  done?: boolean
  muted?: boolean
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
          done
            ? 'border-success bg-success/10 text-success'
            : 'border-muted-foreground/30 text-muted-foreground',
        )}
      >
        {done ? <Check className="size-3" /> : null}
      </span>
      <div>
        <div
          className={cn(
            'text-sm font-medium',
            muted && 'text-muted-foreground',
          )}
        >
          {label}
        </div>
        {detail ? (
          <div className="text-xs text-muted-foreground">{detail}</div>
        ) : null}
      </div>
    </li>
  )
}
