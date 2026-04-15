import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"
import { defineConfig, devices } from "@playwright/test"

// Playwright does not read .env / .env.local (Next.js does for `pnpm dev`).
// Load the same files so E2E_* and NEXT_PUBLIC_* are available to tests and webServer.
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true })
loadEnv({
  path: resolve(process.cwd(), ".env.local"),
  override: true,
  quiet: true,
})

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
const appUrl = `http://localhost:${port}`
const authFile = resolve(process.cwd(), "playwright/.auth/user.json")

/** When false, skip setup + authenticated specs (no storageState file required). */
const runAuthenticatedE2E = Boolean(
  process.env.E2E_EMAIL &&
  process.env.E2E_PASSWORD &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [/.*\.setup\.ts$/, /.*\.authenticated\.spec\.ts$/],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(runAuthenticatedE2E
      ? [
          {
            name: "setup",
            testMatch: /.*\.setup\.ts/,
            use: { ...devices["Desktop Chrome"] },
          },
          {
            name: "chromium-authenticated",
            testMatch: /.*\.authenticated\.spec\.ts$/,
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: authFile,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key",
    },
  },
})
