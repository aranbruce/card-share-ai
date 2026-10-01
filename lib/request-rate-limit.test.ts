import { describe, expect, it } from "vitest"
import { checkFixedWindowRateLimitForKey } from "@/lib/request-rate-limit"

describe("checkFixedWindowRateLimitForKey", () => {
  const config = { namespace: "test:keyed", maxRequests: 2, windowMs: 60_000 }

  it("blocks a key once it passes the limit", () => {
    expect(checkFixedWindowRateLimitForKey("user-a", config).allowed).toBe(true)
    expect(checkFixedWindowRateLimitForKey("user-a", config).allowed).toBe(true)
    const third = checkFixedWindowRateLimitForKey("user-a", config)
    expect(third.allowed).toBe(false)
    expect(Number(third.headers["Retry-After"])).toBeGreaterThan(0)
  })

  it("counts each key separately", () => {
    expect(checkFixedWindowRateLimitForKey("user-b", config).allowed).toBe(true)
  })
})
