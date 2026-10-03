import { beforeEach, describe, expect, it, vi } from "vitest"
import { ALL_CATEGORY_SLUGS } from "@/lib/category-pages"
import { ALL_COMPARE_SLUGS } from "@/lib/compare-pages"
import { loadPublicImage, renderOgPreview } from "@/lib/og-preview"
import {
  renderOccasionPreview,
  renderSitePreview,
  SITE_PREVIEW_KEYS,
  sitePreviewImagePath,
} from "@/lib/site-preview-pages"

vi.mock("@/lib/og-preview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/og-preview")>()),
  renderOgPreview: vi.fn(async () => new Response("jpeg")),
  loadPublicImage: vi.fn(async (src: string | null) =>
    src ? `data:${src}` : null,
  ),
}))

describe("site link previews", () => {
  beforeEach(() => {
    vi.mocked(renderOgPreview).mockClear()
    vi.mocked(loadPublicImage).mockClear()
  })

  it("has a preview for every compare page", () => {
    for (const slug of ALL_COMPARE_SLUGS) {
      expect(SITE_PREVIEW_KEYS).toContain(`compare-${slug}`)
    }
  })

  it("renders every page's preview with all its images found", async () => {
    for (const key of SITE_PREVIEW_KEYS) {
      expect(await renderSitePreview(key)).not.toBeNull()
    }
    expect(renderOgPreview).toHaveBeenCalledTimes(SITE_PREVIEW_KEYS.length)
    for (const [src] of vi.mocked(loadPublicImage).mock.calls) {
      expect(src).toMatch(/^\//)
    }
  })

  it("renders every occasion page's preview with its cover", async () => {
    for (const slug of ALL_CATEGORY_SLUGS) {
      expect(await renderOccasionPreview(slug)).not.toBeNull()
    }
    expect(loadPublicImage).toHaveBeenCalledWith(
      "/occasions/birthday.webp",
      290,
      362,
    )
  })

  it("returns null for an unknown page or occasion", async () => {
    expect(await renderSitePreview("nope")).toBeNull()
    expect(await renderOccasionPreview("nope")).toBeNull()
    expect(renderOgPreview).not.toHaveBeenCalled()
  })

  it("serves previews under /og/page", () => {
    expect(sitePreviewImagePath("teams")).toBe("/og/page/teams")
  })
})
