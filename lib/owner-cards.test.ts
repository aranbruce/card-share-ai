import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getOwnerCardDetail, listOwnerCards } from "@/lib/owner-cards"

const CARD_ID = "550e8400-e29b-41d4-a716-446655440000"

function mockSupabase(handlers: {
  cardsSelect?: () => unknown
  contributionsSelect?: () => unknown
}) {
  const from = vi.fn((table: string) => {
    if (table === "cards") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => handlers.cardsSelect?.()),
        single: vi.fn(() => handlers.cardsSelect?.()),
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
    throw new Error(`unexpected table ${table}`)
  })
  return { from } as unknown as SupabaseClient & { from: typeof from }
}

describe("listOwnerCards", () => {
  it("returns cards ordered by created_at", async () => {
    const cards = [{ id: "c1", recipient_name: "Sam" }]
    const supabase = mockSupabase({
      cardsSelect: () => ({ data: cards, error: null }),
    })

    const result = await listOwnerCards(supabase, "user-1")
    expect(result).toEqual(cards)
  })

  it("throws when the query fails", async () => {
    const supabase = mockSupabase({
      cardsSelect: () => ({ data: null, error: { message: "db down" } }),
    })

    await expect(listOwnerCards(supabase, "user-1")).rejects.toThrow("db down")
  })
})

describe("getOwnerCardDetail", () => {
  it("returns null for non-UUID card ids without querying", async () => {
    const supabase = mockSupabase({})

    const result = await getOwnerCardDetail(supabase, "user-1", "not-a-uuid")
    expect(result).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns null when the card is missing", async () => {
    const supabase = mockSupabase({
      cardsSelect: () => ({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    })

    const result = await getOwnerCardDetail(supabase, "user-1", CARD_ID)
    expect(result).toBeNull()
  })

  it("throws when the card query fails for reasons other than not found", async () => {
    const supabase = mockSupabase({
      cardsSelect: () => ({
        data: null,
        error: { code: "XX000", message: "db down" },
      }),
    })

    await expect(
      getOwnerCardDetail(supabase, "user-1", CARD_ID),
    ).rejects.toThrow("db down")
  })

  it("returns card with contributions when both queries succeed", async () => {
    const supabase = mockSupabase({
      cardsSelect: () => ({
        data: {
          id: CARD_ID,
          user_id: "user-1",
          recipient_name: "Sam",
          sender_name: "Alex",
          copy_headline: "Hi",
          copy_message: "Hello",
          image_url: "https://example.com/a.png",
          contributor_link_id: "link-1",
          extra_pages: 1,
        },
        error: null,
      }),
      contributionsSelect: () => ({
        data: [
          {
            id: "contrib-1",
            card_id: CARD_ID,
            message: "Note",
            is_creator: true,
            page_index: 0,
          },
        ],
        error: null,
      }),
    })

    const result = await getOwnerCardDetail(supabase, "user-1", CARD_ID)
    expect(result?.card.id).toBe(CARD_ID)
    expect(result?.contributions).toHaveLength(1)
    expect(result?.contributionsLoaded).toBe(true)
  })
})
