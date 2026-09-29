/**
 * Real customer quotes and logos for social proof. Sections that read these render nothing
 * while the lists are empty, so only add entries you have permission to publish, verbatim.
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

export const CUSTOMER_LOGOS: CustomerLogo[] = []

/** Quotes for one occasion page first, then general ones, capped at `limit`. */
export function testimonialsFor(
  occasion: string | undefined,
  limit = 3,
  all: Testimonial[] = TESTIMONIALS,
): Testimonial[] {
  const matching = occasion ? all.filter((t) => t.occasion === occasion) : []
  const general = all.filter((t) => !t.occasion)
  return [...matching, ...general].slice(0, limit)
}
