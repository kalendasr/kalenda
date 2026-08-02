import * as React from 'react'
import type { z } from 'zod'

/**
 * Kleine formulierhook met realtime validatie (DESIGN_SYSTEM.md §11).
 *
 * Valideert met een gedeeld zod-schema (één bron van waarheid, CLAUDE.md §28).
 * Fouten verschijnen zodra een veld is aangeraakt of nadat er is ingediend —
 * niet pas na submit — en verdwijnen realtime wanneer de invoer klopt.
 */
export function useZodForm<TSchema extends z.ZodType>({
  schema,
  initialValues,
  onSubmit,
}: {
  schema: TSchema
  initialValues: z.input<TSchema>
  onSubmit: (values: z.output<TSchema>) => Promise<void> | void
}) {
  type Values = z.input<TSchema>
  type FieldKey = keyof Values & string

  const [values, setValues] = React.useState<Values>(initialValues)
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | undefined>()

  const allErrors = React.useMemo(() => {
    const map: Record<string, string> = {}
    const result = schema.safeParse(values)

    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        // Eerste fout per veld wint, zodat we niet stapelen.
        if (key && !map[key]) map[key] = issue.message
      }
    }

    return map
  }, [schema, values])

  /** Fout die zichtbaar mag zijn: alleen voor aangeraakte velden of na submit. */
  function errorFor(field: FieldKey): string | undefined {
    if (!submitted && !touched[field]) return undefined
    return allErrors[field]
  }

  function setValue<TKey extends FieldKey>(field: TKey, value: Values[TKey]) {
    setValues(
      (current) =>
        ({ ...(current as Record<string, unknown>), [field]: value }) as Values,
    )
    setFormError(undefined)
  }

  function handleBlur(field: FieldKey) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(undefined)

    const result = schema.safeParse(values)
    if (!result.success) return

    setIsSubmitting(true)
    try {
      await onSubmit(result.data)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Er ging iets mis. Probeer het opnieuw.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    values,
    setValue,
    errorFor,
    handleBlur,
    handleSubmit,
    isSubmitting,
    formError,
    setFormError,
    isValid: Object.keys(allErrors).length === 0,
  }
}
