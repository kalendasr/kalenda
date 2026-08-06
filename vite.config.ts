import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Padaliassen (`#/...`) worden opgelost via het `imports`-veld in package.json
 * (Vite), `paths` in tsconfig.json (TypeScript) en `resolve.alias` in
 * vitest.config.ts (tests). Er is dus geen extra plugin nodig.
 *
 * Let op: plain Node accepteert `#/` niet als specifier. Alle applicatiecode
 * loopt via Vite, maar losse scripts die je met `node` start moeten relatieve
 * imports gebruiken.
 */
export default defineConfig({
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  server: {
    // Vite's dev-server valideert de Host-header uit veiligheid. Achter de
    // Caddy reverse proxy op de test-omgeving (kalenda.mijnonline.shop) komt
    // die header door als het domein, niet als localhost — zonder deze regel
    // blokkeert Vite elk verzoek met "Blocked request. This host is not
    // allowed." `npm run dev` (lokaal, zonder proxy) blijft ongemoeid.
    allowedHosts: ['kalenda.mijnonline.shop'],
  },
})
