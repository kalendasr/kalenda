/** Alleen paden binnen de site: begint met '/', niet met '//' of '/\'. */
export function safeRedirect(value: string | undefined | null): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
