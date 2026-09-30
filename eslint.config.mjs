import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier/flat"
import tailwind from "eslint-plugin-tailwindcss"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** CSS entry with `@import 'tailwindcss'` — used by Tailwind v4 + `@tailwindcss/postcss` */
const tailwindCssEntry = path.join(__dirname, "app/globals.css")

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // ESLint 10 removed context.getFilename(); pinning the React version skips
  // eslint-plugin-react's auto-detect path that still calls it.
  {
    settings: {
      react: { version: "19.3" },
    },
  },
  tailwind.configs.recommended,
  {
    plugins: { tailwindcss: tailwind },
    settings: {
      tailwindcss: {
        // v4: point at the main stylesheet (not tailwind.config.js).
        cssConfigPath: tailwindCssEntry,
      },
    },
    rules: {
      // Marker / animation classes from local CSS. `inputs` silences a false
      // positive on `clsx(inputs)` in lib/utils.ts (variable name, not a class).
      // Fractional `leading-*` / `opacity-*` are valid Tailwind v4 utilities;
      // eslint-plugin-tailwindcss 4.4 still treats them as custom.
      "tailwindcss/no-custom-classname": [
        "warn",
        {
          whitelist: [
            "inputs",
            "hero-drift",
            "demo-float",
            "card-pastel",
            "card-3d-.*",
            "ai-refine-shimmer-.*",
            "leading-\\d+\\.\\d+",
            "opacity-\\d+\\.\\d+",
            "dark:opacity-\\d+\\.\\d+",
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
