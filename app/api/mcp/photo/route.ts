import { captureServerEvent } from "@/lib/posthog-server"
import { resolveSourceImage } from "@/lib/resolve-image-for-model"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import {
  cardGenerationLimitError,
  generateAndSaveCard,
  loadCardSummary,
  redrawCoverFromPhoto,
} from "@/lib/mcp/card-ops"
import { formatCardText } from "@/lib/mcp/card-summary"
import { photoUploadFor, verifyPhotoToken } from "@/lib/mcp/photo-token"

// Drawing a cover from a photo takes 20–40 seconds
export const maxDuration = 120

/**
 * The MCP card view runs in the host's sandboxed iframe, on the host's origin,
 * and authenticates with a signed token rather than cookies, so any origin may call.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Takes a photo picked in the MCP card view and either draws a new card's
 * cover from it or redraws an existing card's cover. The photo is only sent to
 * the image model, never stored, as with reference photos on the website.
 */
export async function POST(request: Request) {
  let body: { token?: unknown; photo?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid request." }, 400)
  }

  const payload =
    typeof body.token === "string" ? verifyPhotoToken(body.token) : null
  if (!payload) {
    return json(
      {
        error:
          "This photo link has expired. Ask Claude to show the card again, then try once more.",
      },
      401,
    )
  }
  if (typeof body.photo !== "string" || !body.photo.startsWith("data:image/")) {
    return json({ error: "Please choose an image file." }, 400)
  }

  const limited = cardGenerationLimitError(payload.userId)
  if (limited) return json({ error: limited }, 429)

  const photo = await resolveSourceImage(body.photo)
  if (!photo.ok) return json({ error: photo.message }, 400)

  // The token is our signed statement of who the user is, so act for them
  // with the service role, scoped to their user id like the Slack bot does.
  const supabase = requireServiceRoleClient()
  let cardId: string
  let note: string
  if (payload.purpose === "new-card-photo") {
    const created = await generateAndSaveCard(
      supabase,
      payload.userId,
      payload.card,
      photo.bytes,
    )
    if ("error" in created) return json({ error: created.error }, 500)
    cardId = created.card.id
    note = created.coverFailed
      ? "The card was created, but the cover couldn't be drawn from the photo."
      : "The card was created with a cover drawn from the user's photo."
    captureServerEvent(payload.userId, "card_created", {
      card_id: cardId,
      card_type: payload.card.cardType,
      source: "mcp",
      from_photo: true,
    })
  } else {
    const redrawn = await redrawCoverFromPhoto(
      supabase,
      payload.userId,
      payload.cardId,
      photo.bytes,
    )
    if ("error" in redrawn) return json({ error: redrawn.error }, 500)
    cardId = payload.cardId
    note = "The cover was redrawn from the user's photo."
    captureServerEvent(payload.userId, "card_cover_photo_added", {
      card_id: cardId,
      source: "mcp",
    })
  }

  const loaded = await loadCardSummary(supabase, payload.userId, cardId)
  if ("error" in loaded) return json({ error: loaded.error }, 500)
  return json({
    card: loaded.card,
    // For the model: the view passes this on so it knows what happened
    text: `${note}\n\n${formatCardText(loaded.card)}`,
    // So the view can offer another photo for the same card
    upload: photoUploadFor({
      purpose: "card-photo",
      userId: payload.userId,
      cardId,
    }),
  })
}
