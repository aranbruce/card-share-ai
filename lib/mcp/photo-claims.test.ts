import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import {
  claimPhotoCard,
  completePhotoCardClaim,
  findClaimedCard,
  isStaleClaim,
  releasePhotoCardClaim,
  STALE_CLAIM_MS,
} from "@/lib/mcp/photo-claims"

type Row = {
  nonce: string
  user_id: string
  card_id: string | null
  created_at: string
}

/** Just enough of the Supabase query builder for mcp_photo_card_claims. */
function fakeClaimsTable(rows: Row[] = []) {
  function query(op: "select" | "update" | "delete", patch?: Partial<Row>) {
    const filters: ((r: Row) => boolean)[] = []
    const run = () => {
      const hits = rows.filter((r) => filters.every((f) => f(r)))
      if (op === "delete") {
        for (const hit of hits) rows.splice(rows.indexOf(hit), 1)
      }
      if (op === "update") for (const hit of hits) Object.assign(hit, patch)
      return hits
    }
    const builder = {
      eq: (col: keyof Row, value: unknown) => {
        filters.push((r) => r[col] === value)
        return builder
      },
      is: (col: keyof Row, value: null) => {
        filters.push((r) => r[col] === value)
        return builder
      },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (v: { error: null }) => void) => {
        run()
        resolve({ error: null })
      },
    }
    return builder
  }
  const client = {
    from: () => ({
      insert: async (row: Omit<Row, "card_id" | "created_at">) => {
        if (rows.some((r) => r.nonce === row.nonce)) {
          return { error: { code: "23505", message: "duplicate key" } }
        }
        rows.push({
          ...row,
          card_id: null,
          created_at: new Date().toISOString(),
        })
        return { error: null }
      },
      select: () => query("select"),
      update: (patch: Partial<Row>) => query("update", patch),
      delete: () => query("delete"),
    }),
  }
  return { rows, supabase: client as unknown as SupabaseClient }
}

describe("photo card claims", () => {
  it("lets the first upload claim a link and reports its card after", async () => {
    const { supabase } = fakeClaimsTable()
    expect(await claimPhotoCard(supabase, "n1", "u1")).toEqual({
      kind: "claimed",
    })
    // A second upload while the first is still generating
    expect(await claimPhotoCard(supabase, "n1", "u1")).toEqual({
      kind: "pending",
    })

    await completePhotoCardClaim(supabase, "n1", "card-1")
    expect(await claimPhotoCard(supabase, "n1", "u1")).toEqual({
      kind: "done",
      cardId: "card-1",
    })
    expect(await findClaimedCard(supabase, "n1")).toBe("card-1")
  })

  it("frees a link after a failed attempt", async () => {
    const { supabase } = fakeClaimsTable()
    await claimPhotoCard(supabase, "n1", "u1")
    await releasePhotoCardClaim(supabase, "n1")
    expect(await claimPhotoCard(supabase, "n1", "u1")).toEqual({
      kind: "claimed",
    })
  })

  it("never releases a link that made a card", async () => {
    const { supabase } = fakeClaimsTable()
    await claimPhotoCard(supabase, "n1", "u1")
    await completePhotoCardClaim(supabase, "n1", "card-1")
    await releasePhotoCardClaim(supabase, "n1")
    expect(await findClaimedCard(supabase, "n1")).toBe("card-1")
  })

  it("takes over a claim abandoned mid-generation", async () => {
    const old = new Date(Date.now() - STALE_CLAIM_MS - 1000).toISOString()
    const { supabase, rows } = fakeClaimsTable([
      { nonce: "n1", user_id: "u1", card_id: null, created_at: old },
    ])
    expect(await claimPhotoCard(supabase, "n1", "u1")).toEqual({
      kind: "claimed",
    })
    expect(rows).toHaveLength(1)
    expect(isStaleClaim(rows[0].created_at)).toBe(false)
  })
})
