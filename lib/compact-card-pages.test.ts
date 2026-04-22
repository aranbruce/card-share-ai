import { describe, expect, it } from "vitest"

import { compactCardPages } from "./compact-card-pages"
import type { Contribution } from "./card-body"

const CARD_ID = "card-1"

function row(id: string, page: number | null): Contribution {
  return { id, message: "hi", created_at: "2024-01-01T00:00:00Z", page_index: page }
}

// Builds a minimal Supabase-shaped client that tracks contribution updates.
function buildClient({
  rows,
  selectError,
  updateError,
  cardsError,
}: {
  rows: Contribution[]
  selectError?: string
  updateError?: string
  cardsError?: string
}) {
  const appliedUpdates: { id: string; page_index: number }[] = []
  let contribCallCount = 0

  // Creates a chain whose final await resolves to `result`.
  function terminalChain(result: Promise<{ data: unknown; error: unknown }>) {
    const chain: ReturnType<typeof terminalChain> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      update: () => chain,
      gt: () => chain,
      single: () => result,
      then: (res, rej) => result.then(res, rej),
      catch: (rej) => result.catch(rej),
    } as unknown as ReturnType<typeof terminalChain>
    return chain
  }

  const client = {
    _appliedUpdates: appliedUpdates,
    from(table: string) {
      if (table === "cards") {
        return terminalChain(
          Promise.resolve({
            data: null,
            error: cardsError ? { message: cardsError } : null,
          }),
        )
      }

      // card_contributions
      contribCallCount++

      if (contribCallCount === 1) {
        // Initial select — return the full row set.
        return terminalChain(
          Promise.resolve({
            data: selectError ? null : rows,
            error: selectError ? { message: selectError } : null,
          }),
        )
      }

      // Per-row update — stateful chain so we can capture id + new page_index.
      const state: { id?: string; page_index?: number } = {}
      const updateChain: {
        select: () => typeof updateChain
        update: (p: Record<string, unknown>) => typeof updateChain
        eq: (col: string, val: unknown) => typeof updateChain
        single: () => Promise<{ data: unknown; error: unknown }>
      } = {
        select: () => updateChain,
        update: (patch) => {
          if (typeof patch.page_index === "number") state.page_index = patch.page_index
          return updateChain
        },
        eq: (col, val) => {
          if (col === "id") state.id = val as string
          return updateChain
        },
        single: () => {
          if (updateError) {
            return Promise.resolve({ data: null, error: { message: updateError } })
          }
          appliedUpdates.push({ id: state.id!, page_index: state.page_index! })
          const updated = rows.find((r) => r.id === state.id)
          return Promise.resolve({
            data: { ...updated, page_index: state.page_index },
            error: null,
          })
        },
      }
      return updateChain
    },
  }

  return client
}

describe("compactCardPages", () => {
  it("returns all contributions unchanged when pages are already sequential", async () => {
    const rows = [row("a", 2), row("b", 3)]
    const client = buildClient({ rows })

    const result = await compactCardPages(client as never, CARD_ID)

    expect(result.extra_pages).toBe(0)
    expect(result.contributions).toHaveLength(2)
    // No DB updates needed — pages 2 and 3 are already in order.
    expect(client._appliedUpdates).toHaveLength(0)
  })

  it("fills gaps by renumbering pages starting at 2", async () => {
    const rows = [row("a", 2), row("b", 4)]
    const client = buildClient({ rows })

    const result = await compactCardPages(client as never, CARD_ID)

    // Page 4 should have been remapped to 3; page 2 untouched.
    expect(client._appliedUpdates).toEqual([{ id: "b", page_index: 3 }])
    const b = result.contributions.find((c) => c.id === "b")
    expect(b?.page_index).toBe(3)
  })

  it("leaves page_index null contributions on their current page", async () => {
    const rows = [row("a", null), row("b", 4)]
    const client = buildClient({ rows })

    const result = await compactCardPages(client as never, CARD_ID)

    // Only page 4 compacts (to 2); null-page contribution is untouched.
    expect(client._appliedUpdates).toEqual([{ id: "b", page_index: 2 }])
    const a = result.contributions.find((c) => c.id === "a")
    expect(a?.page_index).toBeNull()
  })

  it("does not remap page 1 (message spread) contributions", async () => {
    const rows = [row("creator", 1), row("guest", 4)]
    const client = buildClient({ rows })

    await compactCardPages(client as never, CARD_ID)

    // page 1 is the message spread — should never be remapped.
    expect(client._appliedUpdates).not.toContainEqual(
      expect.objectContaining({ id: "creator" }),
    )
    // page 4 compacts to 2 (first available extra page).
    expect(client._appliedUpdates).toContainEqual({ id: "guest", page_index: 2 })
  })

  it("always resets extra_pages to 0", async () => {
    const rows = [row("a", 2)]
    const client = buildClient({ rows })

    const result = await compactCardPages(client as never, CARD_ID)

    expect(result.extra_pages).toBe(0)
  })

  it("throws when the initial select fails", async () => {
    const client = buildClient({ rows: [], selectError: "db error" })

    await expect(compactCardPages(client as never, CARD_ID)).rejects.toThrow("db error")
  })

  it("throws when a per-row update fails", async () => {
    const rows = [row("a", 4)] // will be remapped, triggering an update
    const client = buildClient({ rows, updateError: "update failed" })

    await expect(compactCardPages(client as never, CARD_ID)).rejects.toThrow(
      "update failed",
    )
  })

  it("throws when the cards extra_pages reset fails", async () => {
    const rows = [row("a", 2)]
    const client = buildClient({ rows, cardsError: "cards error" })

    await expect(compactCardPages(client as never, CARD_ID)).rejects.toThrow(
      "cards error",
    )
  })
})
