import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
})
