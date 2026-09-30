import type { FullConfig } from "@playwright/test"

// Pages the specs open. `next dev` compiles each route on its first request, and
// with several workers hitting cold routes at once, page.goto can exceed the
// 30s test timeout. Requesting them once here, one at a time, warms the cache.
const WARM_UP_PATHS = [
  "/login",
  "/sign-up-success",
  "/reset-password-success",
  "/error",
  "/create",
  "/dashboard",
]

const WARM_UP_TIMEOUT_MS = 120_000

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL
  if (!baseURL) return

  for (const path of WARM_UP_PATHS) {
    try {
      await fetch(new URL(path, baseURL), {
        signal: AbortSignal.timeout(WARM_UP_TIMEOUT_MS),
      })
    } catch (error) {
      // Best effort: a slow or failing route should still surface in its spec.
      console.warn(`[e2e warm-up] ${path}:`, error)
    }
  }
}
