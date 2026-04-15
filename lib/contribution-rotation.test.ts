import { describe, expect, it } from "vitest"

import {
  MAX_CONTRIBUTION_ROTATION_DEGREES,
  MIN_CONTRIBUTION_ROTATION_DEGREES,
  normalizeContributionRotationDegrees,
} from "./contribution-rotation"

describe("normalizeContributionRotationDegrees", () => {
  it("preserves undefined and null semantics", () => {
    expect(normalizeContributionRotationDegrees(undefined)).toBeUndefined()
    expect(normalizeContributionRotationDegrees(null)).toBeNull()
  })

  it("ignores non-finite and non-number values", () => {
    expect(normalizeContributionRotationDegrees("3")).toBeUndefined()
    expect(normalizeContributionRotationDegrees(Number.NaN)).toBeUndefined()
    expect(normalizeContributionRotationDegrees(Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  it("clamps to the configured min and max", () => {
    expect(normalizeContributionRotationDegrees(-99)).toBe(
      MIN_CONTRIBUTION_ROTATION_DEGREES,
    )
    expect(normalizeContributionRotationDegrees(99)).toBe(
      MAX_CONTRIBUTION_ROTATION_DEGREES,
    )
  })

  it("rounds finite values to integer degrees", () => {
    expect(normalizeContributionRotationDegrees(4.4)).toBe(4)
    expect(normalizeContributionRotationDegrees(4.6)).toBe(5)
    expect(normalizeContributionRotationDegrees(-4.6)).toBe(-5)
  })
})
