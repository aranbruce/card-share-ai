import { describe, expect, it } from "vitest"

import { forCardDisplay, type Contribution } from "./card-body"

describe("forCardDisplay", () => {
  it("uses fallback body message when no creator contribution exists", () => {
    const contributions: Contribution[] = [
      { id: "c1", message: "Happy birthday!", created_at: "2024-01-01T00:00:00.000Z" },
      { id: "c2", message: "Hope you have a great day!", created_at: "2024-01-01T00:00:00.000Z", is_creator: false },
    ]

    expect(forCardDisplay(contributions, "Fallback copy")).toEqual({
      bodyMessage: "Fallback copy",
      displayContributions: contributions,
    })
  })

  it("returns an empty body message when a creator contribution exists", () => {
    const contributions: Contribution[] = [
      { id: "creator", message: "Owner text", created_at: "2024-01-01T00:00:00.000Z", is_creator: true },
      { id: "friend", message: "From me!", created_at: "2024-01-01T00:00:00.000Z" },
    ]

    expect(forCardDisplay(contributions, "Fallback copy")).toEqual({
      bodyMessage: "",
      displayContributions: contributions,
    })
  })

  it("normalizes falsy fallback copy to an empty string", () => {
    expect(forCardDisplay([], "")).toEqual({
      bodyMessage: "",
      displayContributions: [],
    })
  })
})
