/**
 * Real customer quotes and logos for social proof. Only add entries you have permission to
 * publish, verbatim. Until `TESTIMONIALS` has entries, non-production builds show
 * `PLACEHOLDER_TESTIMONIALS` so the section can be reviewed; production shows nothing.
 */

export type Testimonial = {
  quote: string
  name: string
  /** e.g. "People Ops, Acme". */
  role?: string
  /** Occasion slug from `lib/category-pages.ts`; omit for a quote that fits any occasion. */
  occasion?: string
}

export type CustomerLogo = {
  name: string
  /** Path under `public/`, e.g. "/logos/acme.svg". Monochrome SVGs read best. */
  src: string
  width: number
  height: number
}

export const TESTIMONIALS: Testimonial[] = []

/** Made-up quotes for design review. Never shown in production. */
export const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I used to chase twenty people over email for a leaving card. This time I dropped one link in Slack and it was full by lunch.",
    name: "Priya S.",
    role: "Office manager",
  },
  {
    quote:
      "The AI cover looked like something we'd have paid a designer for, and the drafted message gave everyone a starting point.",
    name: "Tom R.",
    role: "Engineering lead",
  },
  {
    quote:
      "Half our team is remote, so a paper card never reached everyone. Now nobody gets left off.",
    name: "Alex M.",
    role: "People Ops",
  },
  {
    quote:
      "Forty notes and a dozen GIFs for her birthday. She read every one out loud on our team call.",
    name: "Jess L.",
    role: "Product designer",
    occasion: "birthday",
  },
  {
    quote:
      "We made his farewell card in the last hour before his leaving drinks and it still felt personal.",
    name: "Sam K.",
    role: "Customer success",
    occasion: "farewell",
  },
  {
    quote: "Signing took seconds on my phone. No app, no account, just a link.",
    name: "Dana W.",
    role: "Sales",
    occasion: "work-anniversary",
  },
]

/** Real quotes when there are any, otherwise placeholders outside production. */
export function activeTestimonials(
  vercelEnv = process.env.VERCEL_ENV,
): Testimonial[] {
  if (TESTIMONIALS.length > 0) return TESTIMONIALS
  return vercelEnv === "production" ? [] : PLACEHOLDER_TESTIMONIALS
}

export const CUSTOMER_LOGOS: CustomerLogo[] = []

/** Quotes for one occasion page first, then general ones, capped at `limit`. */
export function testimonialsFor(
  occasion: string | undefined,
  limit = 3,
  all: Testimonial[] = activeTestimonials(),
): Testimonial[] {
  const matching = occasion ? all.filter((t) => t.occasion === occasion) : []
  const general = all.filter((t) => !t.occasion)
  return [...matching, ...general].slice(0, limit)
}
