import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Padaliassen (`#/...`) komen uit het `imports`-veld in package.json en worden
 * door Node, Vite en TypeScript begrepen — daar is geen plugin voor nodig.
 */
export default defineConfig({
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})
