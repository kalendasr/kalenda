/**
 * Presentationele tint/stip-kleuren voor de categoriebrowser, gecycled op
 * volgorde (niet gekoppeld aan een specifieke categorie-identiteit — puur
 * decoratief, zoals in het Claude Design-ontwerp).
 */
const CATEGORY_PALETTE = [
  { tint: '#EAF0FE', dot: '#1D4ED8' },
  { tint: '#F1EBFC', dot: '#6D3FD1' },
  { tint: '#E9F6EE', dot: '#137A3A' },
  { tint: '#FEF2E4', dot: '#B4700C' },
  { tint: '#E7F4F7', dot: '#0E6B80' },
  { tint: '#FBECEC', dot: '#B4231F' },
  { tint: '#EEF1F6', dot: '#3A4453' },
  { tint: '#FDEEF4', dot: '#A81F5C' },
] as const

// Niet-lege array, dus veilig: index is altijd binnen bereik na de modulo.
const FIRST = CATEGORY_PALETTE[0]

export function categoryColor(index: number) {
  const i = Math.abs(index) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[i] ?? FIRST
}
