/**
 * Times in a named timezone (e.g. "Europe/London") on the server, where the runtime's own
 * zone is UTC. Uses Intl only, so no timezone library is needed.
 */

/** Whether `timeZone` is an IANA zone name this runtime knows. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

/** How far `timeZone` is ahead of UTC at `instant`, in milliseconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  )
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * The instant a wall-clock hour on a date (`YYYY-MM-DD`) happens in `timeZone`, or null for
 * a malformed date. An hour skipped by a clock change lands just after it.
 */
export function zonedHourToUtc(
  date: string,
  hour: number,
  timeZone: string,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match || !Number.isInteger(hour) || hour < 0 || hour > 23) return null
  const [, y, m, d] = match.map(Number)
  const wallClock = Date.UTC(y, m - 1, d, hour)
  // Date.UTC rolls 30 Feb or month 13 over into the next month or year
  const check = new Date(wallClock)
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null

  // Guess with the offset at the wall-clock time, then correct once for a clock change
  // between the guess and the answer.
  let instant = wallClock - zoneOffsetMs(new Date(wallClock), timeZone)
  instant = wallClock - zoneOffsetMs(new Date(instant), timeZone)
  return new Date(instant)
}

/** e.g. "Fri 10 Oct, 9:00 AM BST": a time as someone in `timeZone` sees it. */
export function formatInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso))
}
