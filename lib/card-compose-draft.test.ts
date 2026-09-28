import { describe, expect, it } from "vitest"
import {
  COMPOSE_DRAFT_NOTE_ID,
  composeDraftAsContribution,
} from "./card-compose-draft"

describe("compose draft as a note", () => {
  it("places the draft where it will be posted, with its formatting", () => {
    expect(
      composeDraftAsContribution({
        message: "Happy birthday!",
        giphyUrl: "https://media.giphy.com/a.gif",
        x: 12,
        y: 34,
        pageIndex: 2,
        fontSize: 20,
        textColor: "#112233",
        rotationDegrees: -3,
        fontFamily: "handwritten",
      }),
    ).toEqual({
      id: COMPOSE_DRAFT_NOTE_ID,
      message: "Happy birthday!",
      giphy_url: "https://media.giphy.com/a.gif",
      created_at: "",
      is_creator: false,
      position_x: 12,
      position_y: 34,
      width_percent: 75,
      page_index: 2,
      font_size: 20,
      text_color: "#112233",
      rotation_degrees: -3,
      font_family: "handwritten",
    })
  })

  it("keeps a chosen width and defaults missing formatting", () => {
    const note = composeDraftAsContribution({
      message: "",
      x: 0,
      y: 0,
      pageIndex: 1,
      widthPercent: 50,
    })
    expect(note.width_percent).toBe(50)
    expect(note.giphy_url).toBeNull()
    expect(note.font_size).toBeNull()
  })
})
