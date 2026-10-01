import type { SupabaseClient } from "@supabase/supabase-js"

const TABLE = "mcp_photo_card_claims"

/**
 * A claim with no card after this long belongs to an upload whose function
 * died mid-generation (the photo route's maxDuration is 2 minutes), so it may
 * be taken over.
 */
export const STALE_CLAIM_MS = 3 * 60 * 1000

export function isStaleClaim(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt)
  return Number.isNaN(created) || now - created > STALE_CLAIM_MS
}

export type ClaimState =
  { kind: "claimed" } | { kind: "done"; cardId: string } | { kind: "pending" }

/** The card a photo-first link already created, if any. */
export async function findClaimedCard(
  supabase: SupabaseClient,
  nonce: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("card_id")
    .eq("nonce", nonce)
    .maybeSingle()
  if (error) throw new Error(`findClaimedCard: ${error.message}`)
  return data?.card_id ?? null
}

/**
 * Claims a photo-first link before generating its card. The primary key makes
 * this atomic, so two uploads with the same link can't both create a card.
 */
export async function claimPhotoCard(
  supabase: SupabaseClient,
  nonce: string,
  userId: string,
  retried = false,
): Promise<ClaimState> {
  const { error } = await supabase
    .from(TABLE)
    .insert({ nonce, user_id: userId })
  if (!error) return { kind: "claimed" }
  // 23505: unique violation, i.e. the link was claimed already
  if (error.code !== "23505")
    throw new Error(`claimPhotoCard: ${error.message}`)

  const { data, error: readError } = await supabase
    .from(TABLE)
    .select("card_id, created_at")
    .eq("nonce", nonce)
    .maybeSingle()
  if (readError) throw new Error(`claimPhotoCard: ${readError.message}`)
  if (data?.card_id) return { kind: "done", cardId: data.card_id }
  if (data && !isStaleClaim(data.created_at)) return { kind: "pending" }
  if (retried) return { kind: "pending" }

  // Abandoned (or just deleted): clear it and try once more
  await supabase.from(TABLE).delete().eq("nonce", nonce).is("card_id", null)
  return claimPhotoCard(supabase, nonce, userId, true)
}

export async function completePhotoCardClaim(
  supabase: SupabaseClient,
  nonce: string,
  cardId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ card_id: cardId })
    .eq("nonce", nonce)
  if (error) console.error("[mcp/photo] complete claim FAIL:", error)
}

/** Frees the link after a failed attempt, so the user can try another photo. */
export async function releasePhotoCardClaim(
  supabase: SupabaseClient,
  nonce: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("nonce", nonce)
    .is("card_id", null)
  if (error) console.error("[mcp/photo] release claim FAIL:", error)
}
