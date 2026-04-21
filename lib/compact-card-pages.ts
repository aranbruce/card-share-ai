import type { SupabaseClient } from "@supabase/supabase-js"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "./contribution-public-columns"
import type { Contribution } from "./card-body"

/**
 * Removes blank extra pages by renumbering contributions on pages ≥ 2 so their
 * indices are sequential (2, 3, 4, …) with no gaps, then sets extra_pages = 0.
 * Page 0 (cover) and page 1 (message spread) are never touched.
 * Returns the full updated contribution list.
 */
export async function compactCardPages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  cardId: string,
): Promise<{ contributions: Contribution[]; extra_pages: 0 }> {
  const { data: rows, error: selectError } = await supabase
    .from("card_contributions")
    .select(CONTRIBUTION_PUBLIC_COLUMNS)
    .eq("card_id", cardId)
    .order("created_at", { ascending: true })

  if (selectError) throw new Error(selectError.message)

  const contributions: Contribution[] = rows ?? []

  // Distinct extra pages (≥ 2; page 0 = cover, page 1 = message spread) that have at
  // least one contribution, sorted. Starting compaction at 2 prevents contributions from
  // being shifted onto the message page.
  const usedPages = [
    ...new Set(
      contributions
        .map((c) => c.page_index)
        .filter((p): p is number => typeof p === "number" && p >= 2),
    ),
  ].sort((a, b) => a - b)

  // Map old page index → new sequential index starting at 2.
  const pageMap = new Map<number, number>()
  usedPages.forEach((oldPage, idx) => {
    const newPage = idx + 2
    if (oldPage !== newPage) pageMap.set(oldPage, newPage)
  })

  const updated = await Promise.all(
    contributions.map(async (c) => {
      if (c.page_index === null || c.page_index === undefined || !pageMap.has(c.page_index)) {
        return c
      }
      const newPage = pageMap.get(c.page_index)!
      const { data, error: updateError } = await supabase
        .from("card_contributions")
        .update({ page_index: newPage })
        .eq("id", c.id)
        .select(CONTRIBUTION_PUBLIC_COLUMNS)
        .single()
      if (updateError) throw new Error(updateError.message)
      return data as Contribution
    }),
  )

  const { error: pagesUpdateError } = await supabase
    .from("cards")
    .update({ extra_pages: 0 })
    .eq("id", cardId)
    .gt("extra_pages", 0)
  if (pagesUpdateError) throw new Error(pagesUpdateError.message)

  return { contributions: updated, extra_pages: 0 }
}
