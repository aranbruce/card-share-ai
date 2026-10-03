import { beforeEach, describe, expect, it, vi } from "vitest"

const LINK_ID = "550e8400-e29b-41d4-a716-446655440000"

const CARD = {
  id: "card-1",
  sent_at: null,
  card_type: "birthday",
  recipient_name: "Sam",
  sender_name: "Team",
  copy_headline: "Happy birthday",
  copy_message: "Wishing you the best",
  image_url: "https://example.com/cover.jpg",
  extra_pages: 0,
}

vi.mock("@/lib/supabase/admin", () => ({
  requireServiceRoleClient: vi.fn(),
}))

import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { getContributeCardByLinkId } from "./contribute-card"

function mockSupabase(handlers: {
  cardSelect?: () => unknown
  contributionsSelect?: () => unknown
  scheduleSelect?: () => unknown
}) {
  const from = vi.fn((table: string) => {
    if (table === "cards") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn(() => handlers.cardSelect?.()),
      }
      return chain
    }
    if (table === "card_contributions") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => handlers.contributionsSelect?.()),
      }
      return chain
    }
    if (table === "card_send_schedules") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn(
          () => handlers.scheduleSelect?.() ?? { data: null, error: null },
        ),
      }
      return chain
    }
    throw new Error(`unexpected table ${table}`)
  })
  return { from }
}

describe("getContributeCardByLinkId", () => {
  beforeEach(() => {
    vi.mocked(requireServiceRoleClient).mockReset()
  })

  it("returns null for non-UUID link ids", async () => {
    await expect(getContributeCardByLinkId("bad-id")).resolves.toBeNull()
    expect(requireServiceRoleClient).not.toHaveBeenCalled()
  })

  it("returns null when the card is missing", async () => {
    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({ data: null, error: null }),
      }) as never,
    )

    await expect(getContributeCardByLinkId(LINK_ID)).resolves.toBeNull()
  })

  it("throws when the card query fails", async () => {
    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({
          data: null,
          error: { message: "db down" },
        }),
      }) as never,
    )

    await expect(getContributeCardByLinkId(LINK_ID)).rejects.toThrow(
      "Failed to fetch card",
    )
  })

  it("returns empty contributions when the contributions query fails", async () => {
    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({ data: CARD, error: null }),
        contributionsSelect: () => ({
          data: null,
          error: { message: "contrib error" },
        }),
      }) as never,
    )

    await expect(getContributeCardByLinkId(LINK_ID)).resolves.toEqual({
      card: { ...CARD, scheduled_send_at: null },
      contributions: [],
    })
  })

  it("returns the card and contributions on success", async () => {
    const contributions = [
      {
        id: "c1",
        card_id: CARD.id,
        contributor_name: "Alex",
        message: "Congrats!",
      },
    ]

    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({ data: CARD, error: null }),
        contributionsSelect: () => ({ data: contributions, error: null }),
      }) as never,
    )

    await expect(getContributeCardByLinkId(LINK_ID)).resolves.toEqual({
      card: { ...CARD, scheduled_send_at: null },
      contributions,
    })
  })

  it("adds a pending scheduled send as the deadline to sign", async () => {
    const sendAt = "2026-10-10T08:00:00.000Z"
    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({ data: CARD, error: null }),
        contributionsSelect: () => ({ data: [], error: null }),
        scheduleSelect: () => ({
          data: { send_at: sendAt, state: "scheduled" },
          error: null,
        }),
      }) as never,
    )

    const result = await getContributeCardByLinkId(LINK_ID)
    expect(result?.card.scheduled_send_at).toBe(sendAt)
  })

  it("ignores a schedule that has already sent", async () => {
    vi.mocked(requireServiceRoleClient).mockReturnValue(
      mockSupabase({
        cardSelect: () => ({ data: CARD, error: null }),
        contributionsSelect: () => ({ data: [], error: null }),
        scheduleSelect: () => ({
          data: { send_at: "2026-10-01T08:00:00.000Z", state: "sent" },
          error: null,
        }),
      }) as never,
    )

    const result = await getContributeCardByLinkId(LINK_ID)
    expect(result?.card.scheduled_send_at).toBeNull()
  })
})
