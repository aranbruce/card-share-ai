import { describe, expect, it } from "vitest"

import { friendlyAuthError } from "./auth-errors"

const expectedRateLimitMessage =
  "Too many attempts were made recently from this network. Please wait several minutes before trying again."

describe("friendlyAuthError", () => {
  it("maps explicit 429 status codes to a friendly message", () => {
    expect(friendlyAuthError("anything", 429)).toBe(expectedRateLimitMessage)
  })

  it("maps common rate-limit message variants", () => {
    expect(friendlyAuthError("Rate limit exceeded")).toBe(expectedRateLimitMessage)
    expect(friendlyAuthError("TOO MANY REQUESTS")).toBe(expectedRateLimitMessage)
    expect(friendlyAuthError("request failed with status 429")).toBe(
      expectedRateLimitMessage,
    )
  })

  it("returns the original message for non-rate-limit errors", () => {
    const original = "Invalid login credentials"
    expect(friendlyAuthError(original, 400)).toBe(original)
  })
})
