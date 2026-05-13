import { describe, expect, it, vi } from "vitest"
import { createCardForUser, type CreateCardParams } from "./create-card"

const CARD_ID = "card-uuid-123"
const LINK_ID = "link-uuid-456"

const params: CreateCardParams = {
  cardType: "birthday",
  recipientName: "Alice",
  senderName: "Bob",
  copyHeadline: "Happy Birthday, Alice!",
  imageUrl: "https://example.com/image.png",
}

describe("createCardForUser", () => {
  it("returns the created card on success", async () => {
    const cardRow = {
      id: CARD_ID,
      contributor_link_id: LINK_ID,
      card_type: params.cardType,
      recipient_name: params.recipientName,
      sender_name: params.senderName,
      copy_headline: params.copyHeadline,
      image_url: params.imageUrl,
    }

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cards") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: cardRow, error: null }),
              }),
            }),
          }
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as unknown as Parameters<typeof createCardForUser>[0]

    const result = await createCardForUser(supabase, "user-1", params)
    expect("card" in result).toBe(true)
    if ("card" in result) {
      expect(result.card).toEqual(cardRow)
    }
  })

  it("returns an error when the insert fails", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cards") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "DB error" },
                }),
              }),
            }),
          }
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as unknown as Parameters<typeof createCardForUser>[0]

    const result = await createCardForUser(supabase, "user-1", params)
    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.error).toBe("DB error")
    }
  })

  it("coerces invalid extraPages to 0", async () => {
    let capturedInsertData: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cards") {
          return {
            insert: vi
              .fn()
              .mockImplementation((data: Record<string, unknown>) => {
                capturedInsertData = data
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: CARD_ID, ...data },
                      error: null,
                    }),
                  }),
                }
              }),
          }
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as unknown as Parameters<typeof createCardForUser>[0]

    await createCardForUser(supabase, "user-1", { ...params, extraPages: NaN })
    expect(capturedInsertData).not.toBeNull()
    expect((capturedInsertData as Record<string, unknown>).extra_pages).toBe(0)
  })
})
