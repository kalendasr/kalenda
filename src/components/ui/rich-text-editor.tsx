import * as React from 'react'
import {
  Bold,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
} from 'lucide-react'

import { cn } from '#/lib/utils.ts'
import { Button } from '#/components/ui/button.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Markdown } from '#/components/ui/markdown.tsx'

/**
 * Tekstveld met lichte markdown-opmaak (vet, cursief, link, lijsten) en een
 * voorbeeldweergave. Slaat platte markdown op in dezelfde kolom als voorheen
 * — geen schemawijziging nodig — en rendert via `Markdown` (nooit ruwe HTML).
 *
 * Zelfde gecontroleerde `value`/`onChange`-vorm als `Textarea`, dus dit valt
 * in de bestaande `useZodForm` + `FormField`-patroon in te pluggen.
 */

type WrapAction = { type: 'wrap'; before: string; after: string }
type LinePrefixAction = {
  type: 'line-prefix'
  makePrefix: (index: number) => string
}
type ToolbarAction = WrapAction | LinePrefixAction

const TOOLBAR: Array<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: ToolbarAction
}> = [
  {
    label: 'Vet',
    icon: Bold,
    action: { type: 'wrap', before: '**', after: '**' },
  },
  {
    label: 'Cursief',
    icon: Italic,
    action: { type: 'wrap', before: '*', after: '*' },
  },
  {
    label: 'Link',
    icon: Link2,
    action: { type: 'wrap', before: '[', after: '](https://)' },
  },
  {
    label: 'Opsomming',
    icon: List,
    action: { type: 'line-prefix', makePrefix: () => '- ' },
  },
  {
    label: 'Genummerde lijst',
    icon: ListOrdered,
    action: { type: 'line-prefix', makePrefix: (index) => `${index + 1}. ` },
  },
]

export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  rows = 4,
  className,
  ...aria
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  rows?: number
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = React.useState<'write' | 'preview'>('write')

  function applyAction(action: ToolbarAction) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)

    if (action.type === 'wrap') {
      const next =
        value.slice(0, start) +
        action.before +
        selected +
        action.after +
        value.slice(end)
      onChange(next)
      const cursor = start + action.before.length
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(cursor, cursor + selected.length)
      })
      return
    }

    // Prefix elke geselecteerde regel (of de huidige regel als er niets is
    // geselecteerd) met een opsomming- of nummerteken.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEnd =
      end +
      (value.slice(end).indexOf('\n') === -1
        ? value.length - end
        : value.slice(end).indexOf('\n'))
    const block = value.slice(lineStart, lineEnd)
    const prefixed = block
      .split('\n')
      .map((line, index) => action.makePrefix(index) + line)
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    onChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + prefixed.length)
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-input',
        aria['aria-invalid'] && 'border-destructive',
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
        {TOOLBAR.map(({ label, icon: Icon, action }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={mode === 'preview'}
            onClick={() => applyAction(action)}
          >
            <Icon className="size-4" />
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode(mode === 'write' ? 'preview' : 'write')}
        >
          {mode === 'write' ? (
            <>
              <Eye /> Voorbeeld
            </>
          ) : (
            <>
              <Pencil /> Bewerken
            </>
          )}
        </Button>
      </div>

      {mode === 'write' ? (
        <Textarea
          id={id}
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="rounded-t-none border-none shadow-none focus-visible:ring-0"
          aria-invalid={aria['aria-invalid']}
          aria-describedby={aria['aria-describedby']}
        />
      ) : (
        <div className="min-h-16 px-3 py-2">
          {value.trim() ? (
            <Markdown className="text-sm">{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nog geen inhoud.</p>
          )}
        </div>
      )}
    </div>
  )
}
