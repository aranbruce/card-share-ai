import { describe, expect, it, vi } from "vitest"
import {
  lookupSlackTimeZone,
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

describe("lookupSlackTimeZone", () => {
  const adapter = (installed: Record<string, string>, tz?: string) => ({
    getInstallation: vi.fn(async (id: string) =>
      installed[id] ? { botToken: installed[id] } : null,
    ),
    webClient: {
      users: { info: vi.fn(async () => ({ user: tz ? { tz } : {} })) },
    },
  })

  it("asks Slack with the workspace install's token", async () => {
    const slack = adapter({ T1: "xoxb-team" }, "Europe/London")
    await expect(lookupSlackTimeZone(slack, ["T1", "E1"], "U1")).resolves.toBe(
      "Europe/London",
    )
    expect(slack.webClient.users.info).toHaveBeenCalledWith({
      user: "U1",
      token: "xoxb-team",
    })
  })

  it("falls back to an org-wide install under the enterprise id", async () => {
    const slack = adapter({ E1: "xoxb-org" }, "America/New_York")
    await expect(lookupSlackTimeZone(slack, ["T1", "E1"], "U1")).resolves.toBe(
      "America/New_York",
    )
    expect(slack.webClient.users.info).toHaveBeenCalledWith({
      user: "U1",
      token: "xoxb-org",
    })
  })

  it("uses UTC with no install, or no timezone on the user", async () => {
    await expect(
      lookupSlackTimeZone(adapter({}), ["T1", ""], "U1"),
    ).resolves.toBe("UTC")
    await expect(
      lookupSlackTimeZone(adapter({ T1: "xoxb" }), ["T1"], "U1"),
    ).resolves.toBe("UTC")
  })
})
