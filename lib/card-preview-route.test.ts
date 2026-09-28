import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/og/card/[linkId]/route"
import {
  cardPreviewImagePath,
  getCardPreviewByLinkId,
} from "@/lib/card-preview"
import { renderCardPreviewImage } from "@/lib/card-preview-image"

const card = {
  id: "card-1",
  recipient_name: "Sam",
  sender_name: "Aran",
  copy_headline: "Happy Birthday Sam",
  image_url: null,
}

vi.mock("@/lib/card-preview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/card-preview")>()),
  getCardPreviewByLinkId: vi.fn(),
}))
vi.mock("@/lib/card-preview-image", () => ({
  renderCardPreviewImage: vi.fn(
    async () =>
      new Response("png", { headers: { "content-type": "image/png" } }),
  ),
}))

const linkId = "3f1c2d4e-5b18-4ba6-93e9-d7c38ad1872f"
const get = (path: string) =>
  GET(new NextRequest(`https://cardshare.ai${path}`), {
    params: Promise.resolve({ linkId }),
  })

describe("card preview route", () => {
  beforeEach(() => {
    vi.mocked(getCardPreviewByLinkId).mockReset()
    vi.mocked(renderCardPreviewImage).mockClear()
  })

  it("renders the card's current URL, cacheably", async () => {
    vi.mocked(getCardPreviewByLinkId).mockResolvedValue(card)
    const res = await get(cardPreviewImagePath(linkId, "contribute", card))
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toContain("s-maxage")
    expect(renderCardPreviewImage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "card-1", variant: "contribute" }),
    )
  })

  it("redirects outdated or altered URLs to the current one without rendering", async () => {
    vi.mocked(getCardPreviewByLinkId).mockResolvedValue(card)
    for (const query of [
      "?for=view&v=old",
      "?for=view",
      "",
      "?for=view&v=x&y=1",
    ]) {
      const res = await get(`/og/card/${linkId}${query}`)
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toBe(
        `https://cardshare.ai${cardPreviewImagePath(linkId, "view", card)}`,
      )
    }
    expect(renderCardPreviewImage).not.toHaveBeenCalled()
  })

  it("falls back to the site's default image for unknown cards and errors", async () => {
    vi.mocked(getCardPreviewByLinkId).mockResolvedValueOnce(null)
    const missing = await get(`/og/card/${linkId}`)
    expect(missing.headers.get("location")).toBe(
      "https://cardshare.ai/opengraph-image",
    )
    vi.mocked(getCardPreviewByLinkId).mockRejectedValueOnce(new Error("db"))
    vi.spyOn(console, "error").mockImplementationOnce(() => {})
    const failed = await get(`/og/card/${linkId}`)
    expect(failed.headers.get("location")).toBe(
      "https://cardshare.ai/opengraph-image",
    )
  })
})
