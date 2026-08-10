import { useState } from 'react'
import { Bell } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'

const TITLE_MAX = 50
const BODY_MAX = 140

/**
 * Vrij pushbericht van de organisator naar de klant achter één order
 * (Fase 10) — bijv. "De ingang is verplaatst naar hal B". Gebruikt in de
 * bevestigingspopup na `approvePayment` én in het orderdetail, zodat een
 * organisator een klant ook later nog kan bereiken.
 */
export function CustomerPushForm({
  onSend,
}: {
  onSend: (title: string, body: string) => Promise<number>
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  const canSend = title.trim().length > 0 && body.trim().length > 0

  async function submit() {
    setBusy(true)
    try {
      const delivered = await onSend(title.trim(), body.trim())
      setResult(delivered)
      setTitle('')
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
        placeholder="Titel, bijv. Ingang verplaatst"
        maxLength={TITLE_MAX}
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
        placeholder="Bericht aan de klant"
        maxLength={BODY_MAX}
        className="min-h-16"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {body.length}/{BODY_MAX}
        </span>
        <Button size="sm" disabled={!canSend || busy} onClick={submit}>
          <Bell />
          {busy ? 'Versturen…' : 'Verstuur melding'}
        </Button>
      </div>
      {result !== null ? (
        <p className="text-xs text-muted-foreground">
          {result > 0
            ? `Verstuurd naar ${result} apparaat${result === 1 ? '' : 'en'}.`
            : 'De klant heeft geen meldingen aanstaan — het bericht kon niet worden bezorgd.'}
        </p>
      ) : null}
    </div>
  )
}
