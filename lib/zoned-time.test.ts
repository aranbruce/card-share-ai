import { describe, expect, it } from "vitest"
import {
  formatInTimeZone,
  isValidTimeZone,
  zonedHourToUtc,
} from "@/lib/zoned-time"

describe("zonedHourToUtc", () => {
  it("converts a wall-clock hour in summer and winter time", () => {
    expect(
      zonedHourToUtc("2026-10-10", 9, "Europe/London")?.toISOString(),
    ).toBe("2026-10-10T08:00:00.000Z")
    expect(
      zonedHourToUtc("2026-12-10", 9, "Europe/London")?.toISOString(),
    ).toBe("2026-12-10T09:00:00.000Z")
    expect(
      zonedHourToUtc("2026-10-10", 9, "America/New_York")?.toISOString(),
    ).toBe("2026-10-10T13:00:00.000Z")
  })

  it("handles half-hour zones and UTC", () => {
    expect(zonedHourToUtc("2026-10-10", 9, "Asia/Kolkata")?.toISOString()).toBe(
      "2026-10-10T03:30:00.000Z",
    )
    expect(zonedHourToUtc("2026-10-10", 0, "UTC")?.toISOString()).toBe(
      "2026-10-10T00:00:00.000Z",
    )
  })

  it("handles the hours around a clock change", () => {
    // UK clocks go back at 02:00 BST on 25 Oct 2026, so 01:00 happens twice; either is fine
    const repeated = zonedHourToUtc("2026-10-25", 1, "Europe/London")
    expect(["2026-10-25T00:00:00.000Z", "2026-10-25T01:00:00.000Z"]).toContain(
      repeated?.toISOString(),
    )
    // and go forward at 01:00 GMT on 29 Mar 2026, so 01:00 never happens
    const skipped = zonedHourToUtc("2026-03-29", 1, "Europe/London")
    expect(skipped?.getTime()).toBeGreaterThanOrEqual(
      Date.parse("2026-03-29T00:00:00.000Z"),
    )
    expect(
      zonedHourToUtc("2026-03-29", 9, "Europe/London")?.toISOString(),
    ).toBe("2026-03-29T08:00:00.000Z")
  })

  it("rejects malformed dates and hours", () => {
    expect(zonedHourToUtc("10/10/2026", 9, "UTC")).toBeNull()
    expect(zonedHourToUtc("2026-02-30", 9, "UTC")).toBeNull()
    expect(zonedHourToUtc("2026-13-01", 9, "UTC")).toBeNull()
    expect(zonedHourToUtc("2026-10-10", 24, "UTC")).toBeNull()
  })
})

describe("formatInTimeZone", () => {
  it("shows the time as someone in that zone sees it, with the zone", () => {
    const iso = "2026-10-10T08:00:00.000Z"
    expect(formatInTimeZone(iso, "Europe/London")).toBe(
      "Sat 10 Oct, 9:00 am BST",
    )
    expect(formatInTimeZone(iso, "UTC")).toBe("Sat 10 Oct, 8:00 am UTC")
  })
})

describe("isValidTimeZone", () => {
  it("knows real zone names", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true)
    expect(isValidTimeZone("Mars/Olympus")).toBe(false)
  })
})
