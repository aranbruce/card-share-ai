import { describe, expect, it } from "vitest"

import { forCardDisplay, type ContributionRow } from "./card-body"

describe("forCardDisplay", () => {
  it("uses fallback body message when no creator contribution exists", () => {
    const contributions: ContributionRow[] = [
      { id: "c1", message: "Happy birthday!" },
      { id: "c2", message: "Hope you have a great day!", is_creator: false },
    ]

    expect(forCardDisplay(contributions, "Fallback copy")).toEqual({
      bodyMessage: "Fallback copy",
      displayContributions: contributions,
    })
  })

  it("returns an empty body message when a creator contribution exists", () => {
    const contributions: ContributionRow[] = [
      { id: "creator", message: "Owner text", is_creator: true },
      { id: "friend", message: "From me!" },
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
