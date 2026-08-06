/**
 * Kort een tekst in tot ten hoogste `max` tekens en zet er een beletselteken
 * achter. Puur, zodat notificatie-teksten hun lengtebudget respecteren zonder
 * midden in een lang woord af te breken op het scherm van de gebruiker.
 */
export function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  // Ruimte laten voor het ellipsis-teken zelf.
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}
