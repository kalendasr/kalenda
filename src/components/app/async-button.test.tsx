import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AsyncButton } from '#/components/app/async-button.tsx'

describe('AsyncButton', () => {
  it('voert de actie maar één keer uit bij snel dubbelklikken', async () => {
    let release: () => void = () => {}
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    render(
      <AsyncButton onClick={action} pendingLabel="Versturen…">
        Betaalverzoek versturen
      </AsyncButton>,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    expect(action).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Versturen…')

    release()
    await waitFor(() => expect(button).not.toBeDisabled())
    expect(button).toHaveTextContent('Betaalverzoek versturen')
  })

  it('geeft de knop weer vrij wanneer de actie faalt', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const action = vi.fn(() => Promise.reject(new Error('netwerkfout')))

    render(
      <AsyncButton onClick={action} pendingLabel="Versturen…">
        Verstuur tickets
      </AsyncButton>,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => expect(button).not.toBeDisabled())
    expect(button).toHaveTextContent('Verstuur tickets')
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
