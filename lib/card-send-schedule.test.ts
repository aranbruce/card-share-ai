import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

vi.mock("@/lib/email/resend", () => ({
  sendRecipientCardEmail: vi.fn(),
  sendScheduledSendDeliveredEmail: vi.fn(async () => ({ ok: true, id: "o" })),
  sendScheduledSendFailedEmail: vi.fn(async () => ({ ok: true, id: "o" })),
}))
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn() }))
vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "https://cardshare.ai",
}))

import {
  sendRecipientCardEmail,
  sendScheduledSendDeliveredEmail,
  sendScheduledSendFailedEmail,
} from "@/lib/email/resend"
import {
  claimDueSends,
  deliverScheduledSend,
  MAX_SEND_ATTEMPTS,
  parseSendAt,
  type DueSend,
} from "@/lib/card-send-schedule"

const NOW = new Date("2026-10-03T12:00:00.000Z")

describe("parseSendAt", () => {
  it("accepts a time in the allowed window", () => {
    const result = parseSendAt("2026-10-10T08:00:00.000Z", NOW)
    expect(result).toEqual({
      ok: true,
      sendAt: new Date("2026-10-10T08:00:00.000Z"),
    })
  })

  it("rejects missing, invalid, too-soon and too-late times", () => {
    expect(parseSendAt(undefined, NOW).ok).toBe(false)
    expect(parseSendAt("not a date", NOW).ok).toBe(false)
    expect(parseSendAt("2026-10-03T12:05:00.000Z", NOW)).toEqual({
      ok: false,
      error: "Choose a time at least 10 minutes from now",
    })
    expect(parseSendAt("2027-12-01T12:00:00.000Z", NOW)).toEqual({
      ok: false,
      error: "Choose a time within the next year",
    })
  })
})

type Call = { table: string; method: string; args: unknown[] }

/** A Supabase stand-in that records every query call and answers from `results`. */
function fakeSupabase(results: Record<string, unknown> = {}) {
  const calls: Call[] = []
  const from = (table: string) => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {}
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args })
        return chain
      }
    for (const method of [
      "select",
      "update",
      "upsert",
      "delete",
      "eq",
      "is",
      "lte",
      "or",
    ]) {
      chain[method] = record(method)
    }
    chain.maybeSingle = () => results[`${table}.maybeSingle`]
    // Awaiting the chain itself (an update or delete without .single())
    chain.then = (resolve: unknown) =>
      (resolve as (v: unknown) => unknown)(
        results[`${table}.await`] ?? { data: null, error: null },
      )
    return chain
  }
  const auth = {
    admin: {
      getUserById: vi.fn(async () => ({
        data: { user: { email: "owner@example.com" } },
        error: null,
      })),
    },
  }
  return {
    client: { from, auth } as unknown as SupabaseClient,
    calls,
  }
}

const DUE: DueSend = {
  card_id: "card-1",
  user_id: "user-1",
  recipient_email: "mira@example.com",
  attempts: 0,
  claimed_at: NOW.toISOString(),
}

const CARD = {
  data: {
    id: "card-1",
    recipient_name: "Mira",
    sender_name: "The design team",
    contributor_link_id: "link-1",
  },
  error: null,
}

function updatesTo(calls: Call[], table: string) {
  return calls
    .filter((c) => c.table === table && c.method === "update")
    .map((c) => c.args[0] as Record<string, unknown>)
}

describe("claimDueSends", () => {
  it("claims only due, unclaimed (or stale) scheduled sends", async () => {
    const { client, calls } = fakeSupabase({
      "card_send_schedules.await": { data: [DUE], error: null },
    })

    await expect(claimDueSends(client, NOW)).resolves.toEqual([DUE])
    expect(calls).toEqual(
      expect.arrayContaining([
        {
          table: "card_send_schedules",
          method: "update",
          args: [{ claimed_at: NOW.toISOString() }],
        },
        {
          table: "card_send_schedules",
          method: "eq",
          args: ["state", "scheduled"],
        },
        {
          table: "card_send_schedules",
          method: "lte",
          args: ["send_at", NOW.toISOString()],
        },
        {
          table: "card_send_schedules",
          method: "or",
          args: ['claimed_at.is.null,claimed_at.lt."2026-10-03T11:45:00.000Z"'],
        },
      ]),
    )
  })
})

describe("deliverScheduledSend", () => {
  beforeEach(() => {
    vi.mocked(sendRecipientCardEmail).mockReset()
    vi.mocked(sendScheduledSendDeliveredEmail).mockClear()
    vi.mocked(sendScheduledSendFailedEmail).mockClear()
  })

  it("emails the recipient, marks the card sent and tells the owner", async () => {
    vi.mocked(sendRecipientCardEmail).mockResolvedValue({ ok: true, id: "e" })
    const { client, calls } = fakeSupabase({ "cards.maybeSingle": CARD })

    await expect(deliverScheduledSend(client, DUE)).resolves.toBe("sent")

    expect(sendRecipientCardEmail).toHaveBeenCalledWith({
      to: "mira@example.com",
      recipientName: "Mira",
      senderName: "The design team",
      link: "https://cardshare.ai/view/link-1",
    })
    expect(updatesTo(calls, "card_send_schedules")[0]).toMatchObject({
      state: "sent",
      attempts: 1,
      claimed_at: null,
    })
    expect(updatesTo(calls, "cards")[0]).toMatchObject({
      recipient_email: "mira@example.com",
    })
    // Only a card not already shared gets its first sent_at
    expect(calls).toContainEqual({
      table: "cards",
      method: "is",
      args: ["sent_at", null],
    })
    expect(sendScheduledSendDeliveredEmail).toHaveBeenCalledWith({
      to: "owner@example.com",
      recipientName: "Mira",
      link: "https://cardshare.ai/dashboard/cards/card-1",
    })
  })

  it("releases a failed send for a retry", async () => {
    vi.mocked(sendRecipientCardEmail).mockResolvedValue({
      ok: false,
      error: "Resend is down",
    })
    const { client, calls } = fakeSupabase({ "cards.maybeSingle": CARD })

    await expect(deliverScheduledSend(client, DUE)).resolves.toBe("retry")

    expect(updatesTo(calls, "card_send_schedules")[0]).toMatchObject({
      state: "scheduled",
      attempts: 1,
      claimed_at: null,
      last_error: "Resend is down",
    })
    expect(updatesTo(calls, "cards")).toEqual([])
    expect(sendScheduledSendFailedEmail).not.toHaveBeenCalled()
  })

  it("gives up after the last attempt and tells the owner", async () => {
    vi.mocked(sendRecipientCardEmail).mockResolvedValue({
      ok: false,
      error: "Invalid address",
    })
    const { client, calls } = fakeSupabase({ "cards.maybeSingle": CARD })

    await expect(
      deliverScheduledSend(client, { ...DUE, attempts: MAX_SEND_ATTEMPTS - 1 }),
    ).resolves.toBe("failed")

    expect(updatesTo(calls, "card_send_schedules")[0]).toMatchObject({
      state: "failed",
      attempts: MAX_SEND_ATTEMPTS,
    })
    expect(sendScheduledSendFailedEmail).toHaveBeenCalledWith({
      to: "owner@example.com",
      recipientName: "Mira",
      link: "https://cardshare.ai/dashboard/cards/card-1",
    })
  })

  it("doesn't email when the card has no link", async () => {
    const { client } = fakeSupabase({
      "cards.maybeSingle": {
        data: { ...CARD.data, contributor_link_id: null },
        error: null,
      },
    })

    await expect(deliverScheduledSend(client, DUE)).resolves.toBe("retry")
    expect(sendRecipientCardEmail).not.toHaveBeenCalled()
  })
})
