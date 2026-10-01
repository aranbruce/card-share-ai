// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest"

import { clearPendingCard, savePendingCard } from "@/lib/pending-card-storage"
import {
  buildSignUpEmailRedirectTo,
  parseSignUpEmail,
  readSignUpEmailRaw,
  rememberSignUpEmail,
  secondsUntilResend,
} from "./sign-up-email"

beforeEach(() => {
  sessionStorage.clear()
  clearPendingCard()
})

describe("buildSignUpEmailRedirectTo", () => {
  it("returns to /callback without a stored card", () => {
    expect(buildSignUpEmailRedirectTo("https://app.example.com")).toBe(
      "https://app.example.com/callback",
    )
  })

  it("returns to /create to save a stored guest card", () => {
    savePendingCard({
      cardType: "birthday",
      recipientName: "Alice",
      senderName: "Bob",
      copyHeadline: "Happy Birthday!",
      copyMessage: "",
      imageUrl: "https://example.com/image.png",
      extraPages: 0,
    })

    const redirectTo = new URL(
      buildSignUpEmailRedirectTo("https://app.example.com"),
    )
    expect(redirectTo.pathname).toBe("/callback")
    expect(redirectTo.searchParams.get("next")).toBe("/create?action=save")
  })
})

describe("rememberSignUpEmail", () => {
  it("round-trips the email and send time through sessionStorage", () => {
    rememberSignUpEmail("new@example.com", 1_000)

    expect(parseSignUpEmail(readSignUpEmailRaw())).toEqual({
      email: "new@example.com",
      sentAt: 1_000,
    })
  })

  it("keeps the address out of localStorage", () => {
    rememberSignUpEmail("new@example.com", 1_000)

    expect(JSON.stringify({ ...localStorage })).not.toContain("new@example.com")
  })
})

describe("parseSignUpEmail", () => {
  it.each([null, "", "not json", '{"email":"a@b.c"}', '{"sentAt":1}'])(
    "returns null for %j",
    (raw) => {
      expect(parseSignUpEmail(raw)).toBeNull()
    },
  )
})

describe("secondsUntilResend", () => {
  it.each([
    [0, 60],
    [500, 60],
    [1_000, 59],
    [59_500, 1],
    [60_000, 0],
    [120_000, 0],
    // A send time in the future (clock change) never exceeds the cooldown.
    [-5_000, 60],
  ])("after %ims returns %i", (elapsedMs, expected) => {
    expect(secondsUntilResend(10_000, 10_000 + elapsedMs)).toBe(expected)
  })
})
