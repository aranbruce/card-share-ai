import { CARD_PREVIEW_SIZE } from "@/lib/card-preview"
import { SITE_NAME } from "@/lib/site-metadata"
import { renderSitePreview } from "@/lib/site-preview-pages"

export const runtime = "nodejs"

export const size = CARD_PREVIEW_SIZE
export const contentType = "image/jpeg"
export const alt = SITE_NAME

/** The site's default link preview: the home page's, a sample card beside the tagline. */
export default async function OpenGraphImage() {
  const image = await renderSitePreview("home")
  if (!image) throw new Error("Missing home link preview")
  return image
}
