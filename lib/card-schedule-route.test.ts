import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const CARD_ID = "550e8400-e29b-41d4-a716-446655440000"

/** What the signed-in user's Supabase client returns, set per test. */
const db = {
  user: { id: "owner-1" } as { id: string } | null,
  card: { id: CARD_ID, contributor_link_id: "link-1" } as Record<
    string,
    unknown
  > | null,
  updates: [] as Record<string, unknown>[],
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: () => {
      const chain: Record<string, (...args: unknown[]) => unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.maybeSingle = async () => ({ data: db.card, error: null })
      chain.update = (values: unknown) => {
        db.updates.push(values as Record<string, unknown>)
        return chain
      }
      chain.then = (resolve: unknown) =>
        (resolve as (v: unknown) => unknown)({ error: null })
      return chain
    },
  }),
}))
vi.mock("@/lib/supabase/admin", () => ({
  requireServiceRoleClient: () => ({}),
}))
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn() }))
vi.mock("@/lib/request-rate-limit", () => ({
  checkFixedWindowRateLimit: () => ({ allowed: true, headers: {} }),
}))
vi.mock("@/lib/card-send-schedule", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/card-send-schedule")>()),
  scheduleCardSend: vi.fn(async (_service, input) => ({
    send_at: input.sendAt.toISOString(),
    recipient_email: input.recipientEmail,
    state: "scheduled",
    sent_at: null,
  })),
  cancelCardSend: vi.fn(async () => true),
}))

import { DELETE, POST } from "@/app/api/cards/[id]/schedule/route"
import { cancelCardSend, scheduleCardSend } from "@/lib/card-send-schedule"

const params = { params: Promise.resolve({ id: CARD_ID }) }
const inAWeek = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

function post(body: unknown) {
  return POST(
    new NextRequest(`https://cardshare.ai/api/cards/${CARD_ID}/schedule`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params,
  )
}

describe("schedule route", () => {
  beforeEach(() => {
    db.user = { id: "owner-1" }
    db.card = { id: CARD_ID, contributor_link_id: "link-1" }
    db.updates = []
    vi.mocked(scheduleCardSend).mockClear()
    vi.mocked(cancelCardSend).mockClear()
  })

  it("schedules the owner's card and saves the address on it", async () => {
    const sendAt = inAWeek()
    const res = await post({ email: " mira@example.com ", sendAt })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      schedule: { recipient_email: "mira@example.com", state: "scheduled" },
    })
    expect(scheduleCardSend).toHaveBeenCalledWith(expect.anything(), {
      cardId: CARD_ID,
      userId: "owner-1",
      sendAt: new Date(sendAt),
      recipientEmail: "mira@example.com",
    })
    expect(db.updates[0]).toMatchObject({ recipient_email: "mira@example.com" })
  })

  it("needs a signed-in owner of the card", async () => {
    db.user = null
    expect(
      (await post({ email: "a@example.com", sendAt: inAWeek() })).status,
    ).toBe(401)
    db.user = { id: "someone-else" }
    db.card = null
    expect(
      (await post({ email: "a@example.com", sendAt: inAWeek() })).status,
    ).toBe(404)
    expect(scheduleCardSend).not.toHaveBeenCalled()
  })

  it("rejects a bad address or a time that has passed", async () => {
    const badEmail = await post({ email: "nope", sendAt: inAWeek() })
    expect(badEmail.status).toBe(400)
    const past = await post({
      email: "a@example.com",
      sendAt: new Date(Date.now() - 60_000).toISOString(),
    })
    expect(past.status).toBe(400)
    await expect(past.json()).resolves.toEqual({
      error: "Choose a time in the future",
    })
    expect(scheduleCardSend).not.toHaveBeenCalled()
  })

  it("cancels only for the card's owner", async () => {
    const res = await DELETE(
      new NextRequest(`https://cardshare.ai/api/cards/${CARD_ID}/schedule`, {
        method: "DELETE",
      }),
      params,
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, cancelled: true })
    expect(cancelCardSend).toHaveBeenCalledWith(
      expect.anything(),
      CARD_ID,
      "owner-1",
    )

    db.card = null
    const notOwner = await DELETE(
      new NextRequest(`https://cardshare.ai/api/cards/${CARD_ID}/schedule`, {
        method: "DELETE",
      }),
      params,
    )
    expect(notOwner.status).toBe(404)
  })
})
