import type { SupabaseClient } from "@supabase/supabase-js"
import { getAppUrl } from "@/lib/app-url"
import { createCardForUser } from "@/lib/create-card"
import { generateCardCoverArt } from "@/lib/generate-card-cover-art"
import { generateCardHeadline } from "@/lib/generate-card-headline"
import { buildCardCoverArtContext } from "@/lib/generate-card-image"
import { flushPostHogAiSpans } from "@/lib/posthog-ai-flush"
import { checkFixedWindowRateLimitForKey } from "@/lib/request-rate-limit"
import { countSignatures } from "@/lib/mcp/card-messages"
import {
  MCP_CARD_COLUMNS,
  summarizeCard,
  type McpCardRow,
  type McpCardSummary,
} from "@/lib/mcp/card-summary"

const FALLBACK_HEADLINE = "Wishing you all the best!"

/**
 * Caps AI card and cover generation per user, shared by the MCP tools and the
 * photo upload endpoint. Keyed by user: every MCP call arrives from the client
 * platform's IPs. Returns a message to show when the limit is reached.
 */
export function cardGenerationLimitError(userId: string): string | null {
  const rate = checkFixedWindowRateLimitForKey(userId, {
    namespace: "mcp:create-card",
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  })
  if (rate.allowed) return null
  const minutes = Math.ceil(Number(rate.headers["Retry-After"]) / 60)
  return `You've made a lot of cards in a short time. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}

export type NewCardInputs = {
  recipientName: string
  senderName: string
  cardType: string
  tone: string
  context?: string
}

/** Draws and saves a cover; throws when the image can't be generated or stored. */
async function drawCover(
  params: {
    cardType: string
    recipientName: string
    headline: string
    tone?: string
    context?: string
    photo?: Uint8Array
  },
  distinctId: string,
): Promise<string> {
  const ctx = buildCardCoverArtContext({
    cardType: params.cardType,
    recipientName: params.recipientName,
    coverHeadline: params.headline,
    tone: params.tone,
    userContext: params.context,
    source: params.photo,
  })
  const imageUrl = await generateCardCoverArt(ctx, {
    persist: true,
    distinctId,
  })
  if (!imageUrl.startsWith("http")) {
    throw new Error("Image generated but could not be persisted")
  }
  return imageUrl
}

/**
 * Writes the headline, draws the cover (from the user's photo, when given) and
 * saves the card. A failed headline or cover still saves the card, with a
 * fallback headline or no cover, so the user can fix it from the edit link.
 */
export async function generateAndSaveCard(
  supabase: SupabaseClient,
  userId: string,
  inputs: NewCardInputs,
  photo?: Uint8Array,
): Promise<{ card: McpCardRow; coverFailed: boolean } | { error: string }> {
  const { recipientName, senderName, cardType, tone } = inputs
  const context = inputs.context || undefined
  let headline = FALLBACK_HEADLINE
  let imageUrl = ""
  try {
    try {
      headline = await generateCardHeadline(
        {
          cardType,
          recipientName,
          tone,
          userContext: context,
          attached: photo,
        },
        { distinctId: userId },
      )
    } catch (err) {
      console.error("[mcp/card] headline FAIL:", err)
    }
    try {
      imageUrl = await drawCover(
        { cardType, recipientName, headline, tone, context, photo },
        userId,
      )
    } catch (err) {
      console.error("[mcp/card] cover FAIL:", err)
    }
  } finally {
    await flushPostHogAiSpans()
  }

  const result = await createCardForUser(supabase, userId, {
    cardType,
    recipientName,
    senderName,
    copyHeadline: headline,
    imageUrl,
  })
  if ("error" in result) {
    console.error("[mcp/card] save FAIL:", result.error)
    return { error: "Sorry, the card couldn't be saved. Please try again." }
  }
  return { card: result.card as McpCardRow, coverFailed: !imageUrl }
}

/** Redraws an existing card's cover from the user's photo, keeping its headline. */
export async function redrawCoverFromPhoto(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  photo: Uint8Array,
): Promise<{ ok: true } | { error: string }> {
  const { data: card, error } = await supabase
    .from("cards")
    .select("card_type, recipient_name, copy_headline")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[mcp/card] load for photo FAIL:", error)
    return { error: "Sorry, the card couldn't be loaded." }
  }
  if (!card) return { error: "No card with that id in your account." }

  let imageUrl: string
  try {
    imageUrl = await drawCover(
      {
        cardType: card.card_type || "custom",
        recipientName: card.recipient_name || "",
        headline: card.copy_headline || "",
        photo,
      },
      userId,
    )
  } catch (err) {
    console.error("[mcp/card] cover from photo FAIL:", err)
    return {
      error:
        "Sorry, the cover couldn't be drawn from that photo. Try another one.",
    }
  } finally {
    await flushPostHogAiSpans()
  }

  const { error: updateError } = await supabase
    .from("cards")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("user_id", userId)
  if (updateError) {
    console.error("[mcp/card] save cover FAIL:", updateError)
    return { error: "Sorry, the new cover couldn't be saved." }
  }
  return { ok: true }
}

/**
 * One of the user's cards with its signature count, or an error message to
 * return. The count is left out when it can't be loaded, rather than shown as 0.
 */
export async function loadCardSummary(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
): Promise<{ card: McpCardSummary } | { error: string }> {
  const { data, error } = await supabase
    .from("cards")
    .select(MCP_CARD_COLUMNS)
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[mcp/card] load FAIL:", error)
    return { error: "Sorry, the card couldn't be loaded." }
  }
  if (!data) return { error: "No card with that id in your account." }

  const { data: rows, error: rowsError } = await supabase
    .from("card_contributions")
    .select("message, giphy_url")
    .eq("card_id", cardId)
  if (rowsError) {
    console.error("[mcp/card] signatures FAIL:", rowsError)
  }

  return {
    card: summarizeCard(
      getAppUrl(),
      data as McpCardRow,
      rowsError ? undefined : countSignatures(rows ?? []),
    ),
  }
}
