import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/app-url"
import { ALL_CATEGORY_SLUGS } from "@/lib/category-pages"

/** Bump when marketing page content changes meaningfully. */
const MARKETING_LAST_MODIFIED = new Date("2026-07-13")

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl()

  const categoryPages: MetadataRoute.Sitemap = ALL_CATEGORY_SLUGS.map(
    (slug) => ({
      url: `${base}/browse/${slug}`,
      lastModified: MARKETING_LAST_MODIFIED,
    }),
  )

  return [
    { url: base, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/create`, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/browse`, lastModified: MARKETING_LAST_MODIFIED },
    ...categoryPages,
    { url: `${base}/slack/install`, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/privacy`, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/terms`, lastModified: MARKETING_LAST_MODIFIED },
    { url: `${base}/subprocessors`, lastModified: MARKETING_LAST_MODIFIED },
  ]
}
