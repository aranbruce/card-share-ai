import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createPhotoToken,
  PHOTO_TOKEN_TTL_SECONDS,
  photoUploadsEnabled,
  verifyPhotoToken,
} from "@/lib/mcp/photo-token"

const payload = {
  purpose: "card-photo" as const,
  userId: "user-1",
  cardId: "card-1",
}

describe("photo tokens", () => {
  beforeEach(() => {
    process.env.MCP_PHOTO_TOKEN_SECRET = "test-secret"
  })
  afterEach(() => {
    delete process.env.MCP_PHOTO_TOKEN_SECRET
  })

  it("round-trips the payload", () => {
    expect(verifyPhotoToken(createPhotoToken(payload))).toEqual(payload)
  })

  it("rejects a tampered payload", () => {
    const [, sig] = createPhotoToken(payload).split(".")
    const forged = Buffer.from(
      JSON.stringify({ ...payload, userId: "someone-else", exp: 9e9 }),
    ).toString("base64url")
    expect(verifyPhotoToken(`${forged}.${sig}`)).toBeNull()
  })

  it("rejects an expired token", () => {
    const issued = Date.now()
    const token = createPhotoToken(payload, issued)
    const later = issued + (PHOTO_TOKEN_TTL_SECONDS + 1) * 1000
    expect(verifyPhotoToken(token, later)).toBeNull()
  })

  it("rejects tokens signed with another secret", () => {
    const token = createPhotoToken(payload)
    process.env.MCP_PHOTO_TOKEN_SECRET = "rotated"
    expect(verifyPhotoToken(token)).toBeNull()
  })

  it("turns uploads off without a secret", () => {
    delete process.env.MCP_PHOTO_TOKEN_SECRET
    expect(photoUploadsEnabled()).toBe(false)
    expect(verifyPhotoToken("a.b")).toBeNull()
  })
})
