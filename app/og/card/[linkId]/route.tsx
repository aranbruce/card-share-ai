import { NextResponse, type NextRequest } from "next/server"
import {
  getCardPreviewByLinkId,
  parseCardPreviewVariant,
} from "@/lib/card-preview"
import { loadPreviewCover } from "@/lib/card-preview-cover"
import { renderCardPreviewImage } from "@/lib/card-preview-image"
import { DEFAULT_OG_IMAGE_PATH } from "@/lib/site-metadata"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ linkId: string }> }

/** A card's link preview image; the site's default image when the card can't be shown. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { linkId } = await params
  const variant = parseCardPreviewVariant(
    request.nextUrl.searchParams.get("for"),
  )

  try {
    const card = await getCardPreviewByLinkId(linkId)
    if (card) {
      const image = await renderCardPreviewImage({
        id: card.id,
        variant,
        recipientName: card.recipient_name,
        senderName: card.sender_name,
        headline: card.copy_headline,
        cover: await loadPreviewCover(card.image_url),
      })
      // The URL carries a version of the card's content, so edits get a new URL; this only
      // bounds how long an unversioned or outdated URL shows the old image.
      image.headers.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      )
      image.headers.set("X-Robots-Tag", "noindex")
      return image
    }
  } catch (err) {
    console.error("[og/card] FAIL:", err)
  }

  return NextResponse.redirect(new URL(DEFAULT_OG_IMAGE_PATH, request.url))
}
