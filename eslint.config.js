//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',

      // Non-negotiable: geen TODO, FIXME, dead code of placeholders in
      // gecommitte code (zie CLAUDE.md §9).
      'no-warning-comments': [
        'error',
        { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'anywhere' },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'prisma.config.ts',
      'src/routeTree.gen.ts',
      'src/generated/**',
      'src/components/ui/**',
      // Statische assets; sw.js draait als service worker in de browser en
      // hoort niet bij het TypeScript-project.
      'public/**',
      '.output/**',
      'dist/**',
      'coverage/**',
    ],
  },
]
