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
      // Autofix collapses unitless line-height ratios like leading-[0.95] into
      // leading-0.95, which emits no CSS in Tailwind v4 (bare leading-N is a
      // spacing multiple). Keep the other recommended rules on; leave these
      // arbitrary values alone.
      "tailwindcss/no-unnecessary-arbitrary-value": "off",
      // Marker / animation classes from local CSS. `inputs` silences a false
      // positive on `clsx(inputs)` in lib/utils.ts (variable name, not a class).
      "tailwindcss/no-custom-classname": [
        "warn",
        {
          whitelist: [
            "inputs",
            "hero-drift",
            "hero-fan-deal",
            "demo-float",
            "card-pastel",
            "card-3d-.*",
            "ai-refine-shimmer-.*",
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
