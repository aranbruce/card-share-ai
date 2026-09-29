export interface MessageGroup {
  /** e.g. "Funny birthday messages for coworkers" (becomes an H2). */
  title: string
  /** One or two sentences on when this kind of message fits. */
  intro: string
  messages: string[]
}

/** A "what to write" page of example messages for one occasion (`/browse/[slug]/messages`). */
export interface CardMessagesPage {
  /** Must match a slug in `CATEGORY_CONFIGS`. */
  slug: string
  /** ISO date for the sitemap; bump when the page's content changes meaningfully. */
  lastModified: string
  metaTitle: string
  metaDescription: string
  h1: string
  intro: string
  /** Short, practical writing tips. */
  tips: string[]
  groups: MessageGroup[]
  faqs: { q: string; a: string }[]
}
