import path from "path"
import { fileURLToPath } from "url"
import { configDefaults, defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
})
