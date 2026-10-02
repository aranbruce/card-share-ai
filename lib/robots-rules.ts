import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/app-url"

/** Private or per-card paths that should never appear in search or AI answers. */
export const DISALLOWED_PATHS = [
  "/dashboard",
  "/api/",
  "/view/",
  "/contribute/",
  "/recovery-callback",
  "/confirm",
  "/slack/installed",
]

/**
 * AI search and assistant crawlers, named so it's explicit that we welcome them. A
 * crawler that matches a named group ignores the `*` group, so each gets the same rules.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
]

/** Only the production deployment is crawlable; previews would be duplicate content. */
export function isIndexableDeployment(): boolean {
  const env = process.env.VERCEL_ENV
  return !env || env === "production"
}

export function buildRobots(): MetadataRoute.Robots {
  const base = getAppUrl()

  if (!isIndexableDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOWED_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
