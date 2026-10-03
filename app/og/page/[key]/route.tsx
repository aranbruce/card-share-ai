import { notFound } from "next/navigation"
import { renderSitePreview, SITE_PREVIEW_KEYS } from "@/lib/site-preview-pages"

export const runtime = "nodejs"
// Rendered once at build time, from the cover art in `public/`.
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return SITE_PREVIEW_KEYS.map((key) => ({ key }))
}

type RouteContext = { params: Promise<{ key: string }> }

/** A marketing page's link preview: a sample card beside the page's promise. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { key } = await params
  const image = await renderSitePreview(key)
  if (!image) notFound()
  return image
}
