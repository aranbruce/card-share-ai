import { afterEach, describe, expect, it, vi } from "vitest"
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  serializeJsonLd,
} from "./structured-data"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("structured data", () => {
  it("builds an FAQPage from question and answer pairs", () => {
    expect(faqPageJsonLd([{ q: "Is it free?", a: "Yes." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is it free?",
          acceptedAnswer: { "@type": "Answer", text: "Yes." },
        },
      ],
    })
  })

  it("builds absolute breadcrumb URLs in order", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.cardshare.ai")

    const crumbs = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Browse", path: "/browse" },
    ])

    expect(crumbs.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.cardshare.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse",
        item: "https://www.cardshare.ai/browse",
      },
    ])
  })

  it("gives the organization an absolute logo", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.cardshare.ai")

    expect(organizationJsonLd().logo).toBe("https://www.cardshare.ai/icon.png")
  })

  it("escapes < so content can't close the script tag", () => {
    expect(serializeJsonLd({ text: "</script><b>" })).toBe(
      '{"text":"\\u003c/script>\\u003cb>"}',
    )
  })
})
