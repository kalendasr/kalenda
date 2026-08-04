import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Markdown } from '#/components/ui/markdown.tsx'

describe('Markdown', () => {
  it('rendert niets voor lege of ontbrekende inhoud', () => {
    const { container: empty } = render(<Markdown>{''}</Markdown>)
    expect(empty.textContent).toBe('')
    const { container: none } = render(<Markdown>{null}</Markdown>)
    expect(none.textContent).toBe('')
  })

  it('rendert vetgedrukte tekst als <strong>', () => {
    render(<Markdown>Dit is **belangrijk** nieuws.</Markdown>)
    const strong = screen.getByText('belangrijk')
    expect(strong.tagName).toBe('STRONG')
  })

  it('rendert cursieve tekst als <em>', () => {
    render(<Markdown>Dit is *subtiel*.</Markdown>)
    const em = screen.getByText('subtiel')
    expect(em.tagName).toBe('EM')
  })

  it('rendert links met veilige attributen', () => {
    render(<Markdown>Kijk op [onze site](https://example.com).</Markdown>)
    const link = screen.getByRole('link', { name: 'onze site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('rendert bullet-lijsten', () => {
    render(<Markdown>{'- Eerste punt\n- Tweede punt'}</Markdown>)
    expect(screen.getByText('Eerste punt').closest('ul')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('rendert genummerde lijsten', () => {
    render(<Markdown>{'1. Stap een\n2. Stap twee'}</Markdown>)
    expect(screen.getByText('Stap een').closest('ol')).toBeTruthy()
  })

  it('behandelt ruwe HTML als platte, onschadelijke tekst', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script>'}</Markdown>,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })
})
