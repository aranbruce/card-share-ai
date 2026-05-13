import { describe, expect, it, beforeAll } from "vitest"
import { generateLinkToken, verifyLinkToken } from "./chat-link-token"

beforeAll(() => {
  process.env.BOT_LINK_SECRET = "test-secret-for-unit-tests"
})

const payload = { platform: "slack", platformUserId: "U123ABC" }

describe("generateLinkToken", () => {
  it("returns a string containing a dot separator", () => {
    const token = generateLinkToken(payload)
    expect(token).toContain(".")
  })

  it("produces different tokens on each call", () => {
    const a = generateLinkToken(payload)
    const b = generateLinkToken(payload)
    expect(a).not.toBe(b)
  })
})

describe("verifyLinkToken", () => {
  it("accepts a freshly generated token for the same payload", () => {
    const token = generateLinkToken(payload)
    expect(verifyLinkToken(token, payload)).toBe(true)
  })

  it("rejects a token for a different platform", () => {
    const token = generateLinkToken(payload)
    expect(verifyLinkToken(token, { ...payload, platform: "teams" })).toBe(
      false,
    )
  })

  it("rejects a token for a different user ID", () => {
    const token = generateLinkToken(payload)
    expect(verifyLinkToken(token, { ...payload, platformUserId: "U999" })).toBe(
      false,
    )
  })

  it("rejects a tampered token", () => {
    const token = generateLinkToken(payload)
    const tampered = token.slice(0, -4) + "xxxx"
    expect(verifyLinkToken(tampered, payload)).toBe(false)
  })

  it("rejects a token without a dot separator", () => {
    expect(verifyLinkToken("nodothere", payload)).toBe(false)
  })

  it("handles a team ID payload consistently", () => {
    const withTeam = { ...payload, platformTeamId: "T456" }
    const token = generateLinkToken(withTeam)
    expect(verifyLinkToken(token, withTeam)).toBe(true)
    expect(verifyLinkToken(token, payload)).toBe(false)
  })
})
