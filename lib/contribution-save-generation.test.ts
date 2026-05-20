import { describe, expect, it } from "vitest"
import { createContributionSaveGenerationTracker } from "./contribution-save-generation"

describe("contribution-save-generation", () => {
  it("tracks generations per contribution id", () => {
    const tracker = createContributionSaveGenerationTracker()
    const a1 = tracker.next("a")
    const b1 = tracker.next("b")
    const a2 = tracker.next("a")

    expect(a1).toBe(1)
    expect(b1).toBe(1)
    expect(a2).toBe(2)
    expect(tracker.isStale("a", a1)).toBe(true)
    expect(tracker.isStale("a", a2)).toBe(false)
    expect(tracker.isStale("b", b1)).toBe(false)
  })
})
