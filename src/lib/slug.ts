/**
 * Slug-generatie voor organisaties (en later events).
 *
 * Puur en zonder database, zodat het los te testen is. Uniciteit binnen de
 * database wordt afgehandeld door de aanroeper (zie src/server/organization.ts).
 */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      // Diakritische tekens verwijderen (é → e): combining marks U+0300–U+036F.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      // Alles wat geen letter of cijfer is wordt een koppelteken.
      .replace(/[^a-z0-9]+/g, '-')
      // Koppeltekens aan begin en eind weghalen.
      .replace(/^-+|-+$/g, '')
  )
}

/**
 * Voegt een numeriek achtervoegsel toe zodat de slug uniek wordt.
 * `taken` bepaalt of een kandidaat al bestaat.
 */
export function makeUniqueSlug(
  base: string,
  taken: (candidate: string) => boolean,
): string {
  const root = slugify(base) || 'organisatie'

  if (!taken(root)) return root

  let suffix = 2
  while (taken(`${root}-${suffix}`)) {
    suffix += 1
  }

  return `${root}-${suffix}`
}
