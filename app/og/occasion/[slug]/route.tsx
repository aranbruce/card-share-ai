import { notFound } from "next/navigation"
import { renderCardPreviewImage } from "@/lib/card-preview-image"
import { ALL_CATEGORY_SLUGS, getCategoryConfig } from "@/lib/category-pages"
import { loadOccasionPreviewCover } from "@/lib/occasion-preview-cover"

export const runtime = "nodejs"
// Rendered once at build time, from the cover art in `public/`.
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

type RouteContext = { params: Promise<{ slug: string }> }

/** An occasion page's link preview: its sample card beside the page's promise. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params
  const config = getCategoryConfig(slug)
  if (!config) notFound()

  return renderCardPreviewImage({
    id: `occasion-${config.slug}`,
    variant: "view",
    recipientName: config.sampleRecipient,
    senderName: null,
    headline: config.cardTitle,
    cover: await loadOccasionPreviewCover(config.coverImage),
    copy: { title: config.metaTitle, subtitle: config.badge },
  })
}
