import { afterEach, describe, expect, it } from "vitest"

import {
  assertSafeHttpUrl,
  buildContributorInviteHtml,
  buildRecipientCardHtml,
  escapeHtml,
  sanitizeEmailHeaderValue,
  sendRecipientCardEmail,
} from "./resend"
import { EMAIL_BRAND } from "./template"

describe("sanitizeEmailHeaderValue", () => {
  it("strips CR/LF and collapses whitespace", () => {
    expect(sanitizeEmailHeaderValue("  Alice\r\nEvil  ")).toBe("Alice Evil")
    expect(sanitizeEmailHeaderValue("Bob\n\nSmith")).toBe("Bob Smith")
  })

  it("caps length to avoid oversized headers", () => {
    expect(sanitizeEmailHeaderValue("a".repeat(250))).toHaveLength(200)
  })
})

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    )
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
    expect(escapeHtml("it's")).toBe("it&#39;s")
  })
})

describe("assertSafeHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(assertSafeHttpUrl("https://example.com/view/abc")).toBe(
      "https://example.com/view/abc",
    )
    expect(assertSafeHttpUrl("http://localhost:3000/contribute/xyz")).toBe(
      "http://localhost:3000/contribute/xyz",
    )
  })

  it("rejects invalid and non-http(s) URLs", () => {
    expect(() => assertSafeHttpUrl("not-a-url")).toThrow("Invalid link URL")
    expect(() => assertSafeHttpUrl("javascript:alert(1)")).toThrow(
      "Invalid link URL",
    )
  })
})

describe("buildRecipientCardHtml", () => {
  it("escapes user-provided names and links", () => {
    const html = buildRecipientCardHtml({
      recipientName: `<img onerror=alert(1)>`,
      senderName: `Bob "Evil"`,
      link: "https://example.com/view/abc",
    })
    expect(html).toContain("&lt;img onerror=alert(1)&gt;")
    expect(html).toContain("Bob &quot;Evil&quot;")
    expect(html).toContain('href="https://example.com/view/abc"')
    expect(html).toContain(EMAIL_BRAND.brand)
  })
})

describe("buildContributorInviteHtml", () => {
  it("escapes recipient and sender names", () => {
    const html = buildContributorInviteHtml({
      recipientName: "Pat<script>",
      senderName: "Sam",
      link: "https://example.com/contribute/abc",
    })
    expect(html).toContain("Pat&lt;script&gt;&apos;s group card")
    expect(html).not.toContain("<script>")
  })
})

describe("sendRecipientCardEmail", () => {
  const originalApiKey = process.env.RESEND_API_KEY
  const originalFrom = process.env.RESEND_FROM_EMAIL

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY
    } else {
      process.env.RESEND_API_KEY = originalApiKey
    }
    if (originalFrom === undefined) {
      delete process.env.RESEND_FROM_EMAIL
    } else {
      process.env.RESEND_FROM_EMAIL = originalFrom
    }
  })

  it("returns an error when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY
    process.env.RESEND_FROM_EMAIL = "CardShareAI <noreply@example.com>"

    const result = await sendRecipientCardEmail({
      to: "friend@example.com",
      recipientName: "Friend",
      senderName: "Sender",
      link: "https://example.com/view/abc",
    })

    expect(result).toEqual({ ok: false, error: "Missing RESEND_API_KEY" })
  })
})
