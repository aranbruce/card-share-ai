import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/app-url"
import { CATEGORY_CONFIGS } from "@/lib/category-pages"
import { COMPARE_CONFIGS } from "@/lib/compare-pages"

/** Bump when the homepage or browse page content changes meaningfully. */
const MARKETING_LAST_MODIFIED = new Date("2026-09-29")
/** Bump when the Slack install page changes meaningfully. */
const SLACK_LAST_MODIFIED = new Date("2026-09-28")
/** Bump when the support page changes meaningfully. */
const SUPPORT_LAST_MODIFIED = new Date("2026-10-01")
/** Bump when the privacy, terms or sub-processors pages change. */
const LEGAL_LAST_MODIFIED = new Date("2026-09-28")

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl()

  const categoryPages: MetadataRoute.Sitemap = Object.values(
    CATEGORY_CONFIGS,
  ).map((config) => ({
    url: `${base}/browse/${config.slug}`,
    lastModified: new Date(config.lastModified),
  }))

  const comparePages: MetadataRoute.Sitemap = Object.values(
    COMPARE_CONFIGS,
  ).map((config) => ({
    url: `${base}/compare/${config.slug}`,
    lastModified: new Date(config.lastModified),
  }))

  // `/create` is left out: it's an interactive app page with little text to index.
  return [
    { url: base, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/browse`, lastModified: MARKETING_LAST_MODIFIED },
    ...categoryPages,
    ...comparePages,
    { url: `${base}/slack/install`, lastModified: SLACK_LAST_MODIFIED },
    { url: `${base}/support`, lastModified: SUPPORT_LAST_MODIFIED },
    { url: `${base}/privacy`, lastModified: LEGAL_LAST_MODIFIED },
    { url: `${base}/terms`, lastModified: LEGAL_LAST_MODIFIED },
    { url: `${base}/subprocessors`, lastModified: LEGAL_LAST_MODIFIED },
  ]
}
