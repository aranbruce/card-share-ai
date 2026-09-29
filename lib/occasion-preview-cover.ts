import { readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

/**
 * An occasion's cover art (a WebP in `public/`) as a JPEG data URL the preview renderer
 * can draw, or null when the occasion has no art yet or it can't be read.
 */
export async function loadOccasionPreviewCover(
  coverImage: string | null,
): Promise<string | null> {
  if (!coverImage?.startsWith("/occasions/")) return null
  try {
    const file = path.join(process.cwd(), "public", coverImage)
    const jpeg = await sharp(await readFile(file))
      .resize(800, 1000, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`
  } catch (err) {
    console.error("[og/occasion] cover FAIL:", err)
    return null
  }
}
