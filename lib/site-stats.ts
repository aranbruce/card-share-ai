import { unstable_cache } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import type { SiteStats } from "@/lib/social-proof"

const SITE_STATS_REVALIDATE_SECONDS = 60 * 60

async function countSiteStats(): Promise<SiteStats | null> {
  const supabase = createServiceRoleClient()
  if (!supabase) return null

  const [cards, notes] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true }),
    supabase
      .from("card_contributions")
      .select("id", { count: "exact", head: true })
      .eq("is_creator", false),
  ])

  return {
    cards: cards.error ? null : cards.count,
    notes: notes.error ? null : notes.count,
  }
}

const cachedSiteStats = unstable_cache(countSiteStats, ["site-stats"], {
  revalidate: SITE_STATS_REVALIDATE_SECONDS,
})

/** Aggregate usage counts for social proof, refreshed at most hourly. Null when unavailable. */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    return await cachedSiteStats()
  } catch {
    return null
  }
}
