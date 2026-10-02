import { describe, expect, it } from "vitest"
import { SAMPLE_AVATARS, sampleAvatarsFor } from "./sample-avatars"

describe("sampleAvatarsFor", () => {
  it("returns the same faces for the same seed", () => {
    expect(sampleAvatarsFor("birthday", 4)).toEqual(
      sampleAvatarsFor("birthday", 4),
    )
  })

  it("returns different faces, all from the stock set", () => {
    const faces = sampleAvatarsFor("work-anniversary", 5)
    expect(faces).toHaveLength(5)
    expect(new Set(faces).size).toBe(5)
    for (const face of faces) expect(SAMPLE_AVATARS).toContain(face)
  })

  it("never asks for more faces than there are", () => {
    expect(sampleAvatarsFor("x", 50)).toHaveLength(SAMPLE_AVATARS.length)
  })
})
