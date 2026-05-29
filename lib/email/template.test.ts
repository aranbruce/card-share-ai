import { describe, expect, it, vi } from "vitest"

import { EMAIL_BRAND, buildEmailLayout } from "./template"

vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "https://app.example.com",
}))

describe("buildEmailLayout", () => {
  it("includes brand colors and CTA link", () => {
    const html = buildEmailLayout({
      preheader: "Preview text",
      heading: "Hello",
      bodyHtml: "<p>Body</p>",
      ctaLabel: "Click me",
      ctaUrl: "https://app.example.com/view/abc",
      footerNote: "Footer note",
    })

    expect(html).toContain(EMAIL_BRAND.background)
    expect(html).toContain(EMAIL_BRAND.brand)
    expect(html).toContain('href="https://app.example.com/view/abc"')
    expect(html).toContain("Click me")
    expect(html).toContain("https://app.example.com/apple-icon.png")
  })

  it("escapes user-provided heading content", () => {
    const html = buildEmailLayout({
      preheader: "safe",
      heading: `<script>alert(1)</script>`,
      bodyHtml: "<p>ok</p>",
      ctaLabel: "Go",
      ctaUrl: "https://app.example.com/ok",
      footerNote: "Footer",
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})
