import { notFound } from "next/navigation"
import { ALL_CATEGORY_SLUGS } from "@/lib/category-pages"
import { renderOccasionPreview } from "@/lib/site-preview-pages"

export const runtime = "nodejs"
// Rendered once at build time, from the cover art in `public/`.
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

type RouteContext = { params: Promise<{ slug: string }> }

/** An occasion page's link preview: its sample card between two of its photo templates. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params
  const image = await renderOccasionPreview(slug)
  if (!image) notFound()
  return image
}
