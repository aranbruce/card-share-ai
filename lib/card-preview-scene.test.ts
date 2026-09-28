import { describe, expect, it } from "vitest"
import { renderCardScene } from "./card-preview-scene"
import { createImage } from "./perspective-warp"

function cover() {
  const image = createImage(40, 50)
  for (let i = 0; i < image.data.length; i += 4) {
    image.data.set([30, 60, 200, 255], i)
  }
  return image
}

describe("card preview scene", () => {
  const { image, card } = renderCardScene(cover(), 240, 300)
  const at = (x: number, y: number) =>
    Array.from(
      image.data.slice(
        (Math.round(y) * image.width + Math.round(x)) * 4,
        (Math.round(y) * image.width + Math.round(x)) * 4 + 4,
      ),
    )

  it("fits the card to the space, with room around it for the shadow", () => {
    expect(card.width).toBeLessThanOrEqual(241)
    expect(card.height).toBeLessThanOrEqual(301)
    expect(Math.max(card.width / 240, card.height / 300)).toBeCloseTo(1, 1)
    expect(card.x).toBeGreaterThan(0)
    expect(image.width).toBeGreaterThan(card.x + card.width)
    expect(image.height).toBeGreaterThan(card.y + card.height)
  })

  it("shows the cover, lit, in the middle of the card", () => {
    const [r, g, b, a] = at(card.x + card.width * 0.4, card.y + card.height / 2)
    expect(a).toBe(255)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })

  it("shows the cream inside page past the open cover's edge", () => {
    const [r, g, b, a] = at(card.x + card.width - 8, card.y + card.height / 2)
    expect(a).toBe(255)
    expect(Math.min(r, g, b)).toBeGreaterThan(180)
  })

  it("leaves the corners of the image clear", () => {
    expect(at(0, 0)[3]).toBe(0)
  })
})
