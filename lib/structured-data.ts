import { getAppUrl } from "@/lib/app-url"
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site-metadata"

type JsonLdObject = Record<string, unknown>

/**
 * Official profiles for the brand (LinkedIn, X, Product Hunt, Slack Marketplace…).
 * Search engines use these to tie the site to its knowledge panel.
 */
export const SAME_AS_PROFILES: string[] = []

export function organizationJsonLd(): JsonLdObject {
  const appUrl = getAppUrl()
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${appUrl}/#organization`,
    name: SITE_NAME,
    url: appUrl,
    logo: `${appUrl}/icon.png`,
    ...(SAME_AS_PROFILES.length > 0 ? { sameAs: SAME_AS_PROFILES } : {}),
  }
}

export function websiteJsonLd(): JsonLdObject {
  const appUrl = getAppUrl()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${appUrl}/#website`,
    name: SITE_NAME,
    url: appUrl,
    description: SITE_TAGLINE,
    publisher: { "@id": `${appUrl}/#organization` },
  }
}

export function softwareApplicationJsonLd(): JsonLdObject {
  const appUrl = getAppUrl()
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: appUrl,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@id": `${appUrl}/#organization` },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }
}

export function faqPageJsonLd(
  faqs: readonly { q: string; a: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }
}

/** `items` run from the top of the site down to the current page; paths start with "/". */
export function breadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
): JsonLdObject {
  const appUrl = getAppUrl()
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.path === "/" ? appUrl : `${appUrl}${item.path}`,
    })),
  }
}

/** Serialises JSON-LD for a <script> tag; escapes "<" so content can't close the tag. */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
