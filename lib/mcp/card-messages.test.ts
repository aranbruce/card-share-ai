import { describe, expect, it } from "vitest"
import {
  countSignatures,
  creatorNoteUpdate,
  DEFAULT_CREATOR_NOTE_LAYOUT,
} from "@/lib/mcp/card-messages"

describe("countSignatures", () => {
  it("counts notes and GIFs, the author's included", () => {
    expect(
      countSignatures([
        { message: "Happy birthday!" },
        { message: "  ", giphy_url: "https://media.giphy.com/x.gif" },
        { message: "Love, Sam" },
      ]),
    ).toBe(3)
  })

  it("skips the author's empty placeholder note", () => {
    expect(countSignatures([{ message: null }, { message: "Hi" }])).toBe(1)
    expect(countSignatures([{ message: "   " }])).toBe(0)
  })
})

describe("creatorNoteUpdate", () => {
  it("places an unplaced note in the middle of the message page", () => {
    const update = creatorNoteUpdate(
      { position_x: null, position_y: null },
      "Hi",
    )
    expect(update).toEqual({ message: "Hi", ...DEFAULT_CREATOR_NOTE_LAYOUT })
    // 75% of a 448px page, centred
    expect(DEFAULT_CREATOR_NOTE_LAYOUT.position_x).toBe(56)
    expect(DEFAULT_CREATOR_NOTE_LAYOUT.page_index).toBe(1)
  })

  it("keeps a note where the author put it", () => {
    expect(
      creatorNoteUpdate({ position_x: 10, position_y: "40" }, "Hi"),
    ).toEqual({ message: "Hi" })
  })

  it("clears the note without placing it", () => {
    expect(
      creatorNoteUpdate({ position_x: null, position_y: null }, ""),
    ).toEqual({
      message: null,
    })
  })

  it("places the note when there's no author row yet", () => {
    expect(creatorNoteUpdate(null, "Hi")).toMatchObject({ page_index: 1 })
  })
})
