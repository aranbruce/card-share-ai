import { z } from "zod"
import { isValidTimeZone, zonedHourToUtc } from "@/lib/zoned-time"

/**
 * Optional scheduling on the Slack create-card modal: the recipient's email and a date and
 * hour, read in the Slack user's own timezone.
 */

/** Modal field ids. */
export const SCHEDULE_FIELDS = {
  email: "recipient_email",
  date: "send_date",
  hour: "send_hour",
} as const

/** The default hour offered for a scheduled send. */
export const DEFAULT_SEND_HOUR = 9

/** Whole hours only: sends go out on the hour. e.g. "9:00 AM". */
export const SEND_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`,
}))

export type ScheduleRequest = {
  recipientEmail: string
  sendAt: Date
  timeZone: string
}

export type ScheduleFieldsResult =
  | { ok: true; schedule: ScheduleRequest | null }
  | { ok: false; errors: Record<string, string> }

/**
 * Reads the schedule fields from a submitted modal. Both an email and a date schedule the
 * card; neither leaves it unscheduled; one without the other is an error on the other.
 */
export function readScheduleFields(
  values: Record<string, string | undefined>,
  timeZone: string,
  now = new Date(),
): ScheduleFieldsResult {
  const email = (values[SCHEDULE_FIELDS.email] ?? "").trim()
  const date = (values[SCHEDULE_FIELDS.date] ?? "").trim()
  if (!email && !date) return { ok: true, schedule: null }
  if (!date) {
    return {
      ok: false,
      errors: { [SCHEDULE_FIELDS.date]: "Pick a date to send the card" },
    }
  }
  if (!email) {
    return {
      ok: false,
      errors: {
        [SCHEDULE_FIELDS.email]: "Add their email to schedule the card",
      },
    }
  }
  if (!z.string().email().safeParse(email).success) {
    return {
      ok: false,
      errors: { [SCHEDULE_FIELDS.email]: "That email doesn't look right" },
    }
  }

  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC"
  const hour = Number(values[SCHEDULE_FIELDS.hour] ?? DEFAULT_SEND_HOUR)
  const sendAt = zonedHourToUtc(date, hour, zone)
  if (!sendAt) {
    return {
      ok: false,
      errors: { [SCHEDULE_FIELDS.date]: "Pick a valid date" },
    }
  }
  if (sendAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      errors: { [SCHEDULE_FIELDS.date]: "Pick a time in the future" },
    }
  }
  return {
    ok: true,
    schedule: { recipientEmail: email, sendAt, timeZone: zone },
  }
}
