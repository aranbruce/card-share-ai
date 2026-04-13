import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import tailwind from 'eslint-plugin-tailwindcss'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** CSS entry with `@import 'tailwindcss'` — used by Tailwind v4 + `@tailwindcss/postcss` */
const tailwindCssEntry = path.join(__dirname, 'app/globals.css')

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tailwind.configs['flat/recommended'],
  {
    settings: {
      tailwindcss: {
        // v4: point at your main stylesheet (not tailwind.config.js).
        // Resolves the same theme as `@tailwindcss/postcss` when you run the app.
        config: tailwindCssEntry,
        callees: ['classnames', 'clsx', 'ctl', 'cva', 'tv', 'cn'],
        // Marker / non-utility classes from shadcn + Radix (not generated utilities)
        whitelist: ['toaster', 'destructive', 'origin-top-center'],
      },
    },
    rules: {
      // Class order is handled by prettier-plugin-tailwindcss
      'tailwindcss/classnames-order': 'off',
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
