import { describe, expect, it } from "vitest"
import { gifFrameDelayMs } from "./gif-player"

describe("gifFrameDelayMs", () => {
  it("keeps real frame delays", () => {
    expect(gifFrameDelayMs(40)).toBe(40)
    expect(gifFrameDelayMs(250)).toBe(250)
  })

  it("shows zero, tiny and missing delays for 100ms, like browsers", () => {
    expect(gifFrameDelayMs(0)).toBe(100)
    expect(gifFrameDelayMs(10)).toBe(100)
    expect(gifFrameDelayMs(null)).toBe(100)
    expect(gifFrameDelayMs(undefined)).toBe(100)
  })
})
