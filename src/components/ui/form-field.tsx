import * as React from 'react'

import { cn } from '#/lib/utils.ts'
import { Label } from '#/components/ui/label.tsx'

/**
 * Formulierveld in de vaste volgorde uit DESIGN_SYSTEM.md §10:
 * Label → Input → Helptekst → Validatie.
 *
 * Verplichte velden worden gemarkeerd (§10) en de foutmelding wordt via
 * `aria-describedby`/`aria-invalid` aan het invoerveld gekoppeld voor
 * toegankelijkheid (§22). Het invoerveld ontvangt `id` en de aria-attributen
 * via de `renderControl`-functie.
 */

type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: (aria: {
    id: string
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
  }) => React.ReactNode
}

export function FormField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}

      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
