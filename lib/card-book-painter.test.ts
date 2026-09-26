import { describe, expect, it } from "vitest"

import {
  buildNotesByPage,
  wrapText,
} from "@/components/card-book-3d/page-painter"
import type { Contribution } from "@/lib/card-body"

/** Monospace stand-in for canvas text metrics: every character is 10px wide. */
const mono = { measureText: (s: string) => ({ width: s.length * 10 }) }

function row(overrides: Partial<Contribution>): Contribution {
  return {
    id: "row",
    message: "Hi",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("wrapText", () => {
  it("wraps on word boundaries", () => {
    expect(wrapText(mono, "one two three", 70)).toEqual(["one two", "three"])
  })

  it("keeps explicit line breaks and empty lines", () => {
    expect(wrapText(mono, "hi\n\nthere", 100)).toEqual(["hi", "", "there"])
  })

  it("hard-breaks words wider than the line", () => {
    expect(wrapText(mono, "abcdefgh", 30)).toEqual(["abc", "def", "gh"])
  })
})

describe("buildNotesByPage", () => {
  it("places the creator note on the message page and guests after it", () => {
    const byPage = buildNotesByPage(
      [
        row({ id: "creator", is_creator: true, position_x: 1, position_y: 2 }),
        row({ id: "guest" }),
      ],
      1,
      18,
    )
    expect(byPage.get(1)?.map((n) => n.id)).toEqual(["creator"])
    expect(byPage.get(2)?.map((n) => n.id)).toEqual(["guest"])
  })

  it("skips an unplaced creator row like the flat card does", () => {
    const byPage = buildNotesByPage([row({ is_creator: true })], 1, 18)
    expect(byPage.size).toBe(0)
  })

  it("honours explicit pages and coerces layout numbers", () => {
    const [note] =
      buildNotesByPage(
        [
          row({
            page_index: 3,
            position_x: 10,
            position_y: 20,
            font_size: 24,
            rotation_degrees: -3,
          }),
        ],
        1,
        18,
      ).get(3) ?? []
    expect(note).toMatchObject({
      offset: { x: 10, y: 20 },
      widthPercent: 75,
      fontSize: 24,
      rotationDegrees: -3,
    })
  })

  it("defaults unpositioned notes to full width in document flow", () => {
    const [note] = buildNotesByPage([row({})], 1, 16).get(2) ?? []
    expect(note).toMatchObject({
      offset: null,
      widthPercent: 100,
      fontSize: 16,
    })
  })
})
