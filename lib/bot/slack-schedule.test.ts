import { describe, expect, it } from "vitest"
import {
  readScheduleFields,
  SCHEDULE_FIELDS,
  SEND_HOUR_OPTIONS,
} from "@/lib/bot/slack-schedule"

const NOW = new Date("2026-10-03T12:00:00.000Z")

const fields = (email?: string, date?: string, hour?: string) => ({
  [SCHEDULE_FIELDS.email]: email,
  [SCHEDULE_FIELDS.date]: date,
  [SCHEDULE_FIELDS.hour]: hour,
})

describe("readScheduleFields", () => {
  it("leaves the card unscheduled when both are blank", () => {
    expect(readScheduleFields(fields("", ""), "Europe/London", NOW)).toEqual({
      ok: true,
      schedule: null,
    })
  })

  it("reads the date and hour in the user's timezone", () => {
    const result = readScheduleFields(
      fields("mira@example.com", "2026-10-10", "9"),
      "Europe/London",
      NOW,
    )
    expect(result).toEqual({
      ok: true,
      schedule: {
        recipientEmail: "mira@example.com",
        sendAt: new Date("2026-10-10T08:00:00.000Z"),
        timeZone: "Europe/London",
      },
    })
  })

  it("defaults to 9am, and to UTC for an unknown timezone", () => {
    const result = readScheduleFields(
      fields("mira@example.com", "2026-10-10"),
      "",
      NOW,
    )
    expect(result).toMatchObject({
      ok: true,
      schedule: {
        sendAt: new Date("2026-10-10T09:00:00.000Z"),
        timeZone: "UTC",
      },
    })
  })

  it("asks for whichever half is missing, or wrong", () => {
    expect(
      readScheduleFields(fields("mira@example.com", ""), "UTC", NOW),
    ).toEqual({
      ok: false,
      errors: { [SCHEDULE_FIELDS.date]: "Pick a date to send the card" },
    })
    expect(readScheduleFields(fields("", "2026-10-10"), "UTC", NOW)).toEqual({
      ok: false,
      errors: {
        [SCHEDULE_FIELDS.email]: "Add their email to schedule the card",
      },
    })
    expect(
      readScheduleFields(fields("mira", "2026-10-10"), "UTC", NOW),
    ).toMatchObject({
      ok: false,
      errors: { [SCHEDULE_FIELDS.email]: expect.any(String) },
    })
  })

  it("refuses a time that has passed", () => {
    expect(
      readScheduleFields(
        fields("mira@example.com", "2026-10-03", "9"),
        "UTC",
        NOW,
      ),
    ).toEqual({
      ok: false,
      errors: { [SCHEDULE_FIELDS.date]: "Pick a time in the future" },
    })
  })
})

describe("SEND_HOUR_OPTIONS", () => {
  it("offers every whole hour", () => {
    expect(SEND_HOUR_OPTIONS).toHaveLength(24)
    expect(SEND_HOUR_OPTIONS[0]).toEqual({ value: "0", label: "12:00 AM" })
    expect(SEND_HOUR_OPTIONS[9]).toEqual({ value: "9", label: "9:00 AM" })
    expect(SEND_HOUR_OPTIONS[13]).toEqual({ value: "13", label: "1:00 PM" })
  })
})
