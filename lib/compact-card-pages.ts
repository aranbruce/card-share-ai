import type { SupabaseClient } from "@supabase/supabase-js"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "./contribution-public-columns"
import type { Contribution } from "./card-body"

/**
 * Removes blank inner pages by renumbering contributions so page indices are
 * sequential (1, 2, 3, …) with no gaps, then sets extra_pages = 0.
 * Returns the full updated contribution list.
 */
export async function compactCardPages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  cardId: string,
): Promise<{ contributions: Contribution[]; extra_pages: 0 }> {
  const { data: rows } = await supabase
    .from("card_contributions")
    .select(CONTRIBUTION_PUBLIC_COLUMNS)
    .eq("card_id", cardId)
    .order("created_at", { ascending: true })

  const contributions: Contribution[] = rows ?? []

  // Distinct inner pages (≥ 1) that have at least one contribution, sorted.
  const usedPages = [
    ...new Set(
      contributions
        .map((c) => c.page_index)
        .filter((p): p is number => typeof p === "number" && p >= 1),
    ),
  ].sort((a, b) => a - b)

  // Map old page index → new sequential index starting at 1.
  const pageMap = new Map<number, number>()
  usedPages.forEach((oldPage, idx) => {
    const newPage = idx + 1
    if (oldPage !== newPage) pageMap.set(oldPage, newPage)
  })

  const updated = await Promise.all(
    contributions.map(async (c) => {
      if (c.page_index === null || c.page_index === undefined || !pageMap.has(c.page_index)) {
        return c
      }
      const newPage = pageMap.get(c.page_index)!
      const { data } = await supabase
        .from("card_contributions")
        .update({ page_index: newPage })
        .eq("id", c.id)
        .select(CONTRIBUTION_PUBLIC_COLUMNS)
        .single()
      return (data ?? { ...c, page_index: newPage }) as Contribution
    }),
  )

  await supabase
    .from("cards")
    .update({ extra_pages: 0 })
    .eq("id", cardId)
    .gt("extra_pages", 0)

  return { contributions: updated, extra_pages: 0 }
}
