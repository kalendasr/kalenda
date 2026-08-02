import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { z } from 'zod'

import { useZodForm } from '#/lib/use-zod-form.ts'
import { FormField } from '#/components/ui/form-field.tsx'
import { Input } from '#/components/ui/input.tsx'

const schema = z.object({
  email: z.email('Vul een geldig e-mailadres in.'),
})

function TestForm({
  onSubmit,
}: {
  onSubmit: (values: { email: string }) => void
}) {
  const form = useZodForm({
    schema,
    initialValues: { email: '' },
    onSubmit,
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <FormField id="email" label="E-mailadres" error={form.errorFor('email')}>
        {(aria) => (
          <Input
            {...aria}
            value={form.values.email}
            onChange={(e) => form.setValue('email', e.target.value)}
            onBlur={() => form.handleBlur('email')}
          />
        )}
      </FormField>
      <button type="submit">Verzenden</button>
    </form>
  )
}

describe('useZodForm + FormField', () => {
  it('toont geen fout voordat een veld is aangeraakt', () => {
    render(<TestForm onSubmit={() => {}} />)
    expect(screen.queryByText('Vul een geldig e-mailadres in.')).toBeNull()
  })

  it('toont realtime een fout na blur en koppelt aria-attributen', () => {
    render(<TestForm onSubmit={() => {}} />)
    const input = screen.getByLabelText('E-mailadres')

    fireEvent.change(input, { target: { value: 'geen-email' } })
    fireEvent.blur(input)

    const error = screen.getByText('Vul een geldig e-mailadres in.')
    expect(error).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
  })

  it('laat de fout verdwijnen zodra de invoer klopt', () => {
    render(<TestForm onSubmit={() => {}} />)
    const input = screen.getByLabelText('E-mailadres')

    fireEvent.change(input, { target: { value: 'geen-email' } })
    fireEvent.blur(input)
    expect(
      screen.getByText('Vul een geldig e-mailadres in.'),
    ).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'ravi@example.com' } })
    expect(screen.queryByText('Vul een geldig e-mailadres in.')).toBeNull()
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('roept onSubmit alleen aan met geldige waarden', () => {
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)
    const input = screen.getByLabelText('E-mailadres')

    fireEvent.click(screen.getByText('Verzenden'))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: 'ravi@example.com' } })
    fireEvent.click(screen.getByText('Verzenden'))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ravi@example.com' })
  })
})
