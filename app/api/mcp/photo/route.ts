import type { SupabaseClient } from "@supabase/supabase-js"
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
import {
  claimPhotoCard,
  completePhotoCardClaim,
  findClaimedCard,
  releasePhotoCardClaim,
} from "@/lib/mcp/photo-claims"
import {
  photoUploadFor,
  verifyPhotoToken,
  type PhotoTokenPayload,
} from "@/lib/mcp/photo-token"

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

const ALREADY_CREATED = "This card was already created from the user's photo."

/** The card for the view, a summary for the model, and a link for another photo. */
async function cardResponse(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  note: string,
) {
  const loaded = await loadCardSummary(supabase, userId, cardId)
  if ("error" in loaded) return json({ error: loaded.error }, 500)
  return json({
    card: loaded.card,
    // For the model: the view passes this on so it knows what happened
    text: `${note}\n\n${formatCardText(loaded.card)}`,
    // So the view can offer another photo for the same card
    upload: photoUploadFor({ purpose: "card-photo", userId, cardId }),
  })
}

async function createCardFromPhoto(
  supabase: SupabaseClient,
  payload: Extract<PhotoTokenPayload, { purpose: "new-card-photo" }>,
  photoDataUrl: string,
) {
  const claim = await claimPhotoCard(supabase, payload.nonce, payload.userId)
  if (claim.kind === "done") {
    return cardResponse(supabase, payload.userId, claim.cardId, ALREADY_CREATED)
  }
  if (claim.kind === "pending") {
    return json(
      {
        error:
          "Your card is still being created. Give it a moment, then try again.",
      },
      409,
    )
  }

  // Until the card exists, any failure frees the link for another try
  let cardId: string | null = null
  try {
    const limited = cardGenerationLimitError(payload.userId)
    if (limited) return json({ error: limited }, 429)
    const photo = await resolveSourceImage(photoDataUrl)
    if (!photo.ok) return json({ error: photo.message }, 400)

    const created = await generateAndSaveCard(
      supabase,
      payload.userId,
      payload.card,
      photo.bytes,
    )
    if ("error" in created) return json({ error: created.error }, 500)
    cardId = created.card.id
    await completePhotoCardClaim(supabase, payload.nonce, cardId)
    captureServerEvent(payload.userId, "card_created", {
      card_id: cardId,
      card_type: payload.card.cardType,
      source: "mcp",
      from_photo: true,
    })
    return cardResponse(
      supabase,
      payload.userId,
      cardId,
      created.coverFailed
        ? "The card was created, but the cover couldn't be drawn from the photo."
        : "The card was created with a cover drawn from the user's photo.",
    )
  } finally {
    if (!cardId) await releasePhotoCardClaim(supabase, payload.nonce)
  }
}

async function redrawCover(
  supabase: SupabaseClient,
  payload: Extract<PhotoTokenPayload, { purpose: "card-photo" }>,
  photoDataUrl: string,
) {
  const limited = cardGenerationLimitError(payload.userId)
  if (limited) return json({ error: limited }, 429)
  const photo = await resolveSourceImage(photoDataUrl)
  if (!photo.ok) return json({ error: photo.message }, 400)

  const redrawn = await redrawCoverFromPhoto(
    supabase,
    payload.userId,
    payload.cardId,
    photo.bytes,
  )
  if ("error" in redrawn) return json({ error: redrawn.error }, 500)
  captureServerEvent(payload.userId, "card_cover_photo_added", {
    card_id: payload.cardId,
    source: "mcp",
  })
  return cardResponse(
    supabase,
    payload.userId,
    payload.cardId,
    "The cover was redrawn from the user's photo.",
  )
}

/**
 * Takes a photo picked in the MCP card view and either draws a new card's
 * cover from it or redraws an existing card's cover. The photo is only sent to
 * the image model, never stored, as with reference photos on the website.
 *
 * Without a photo, it reports the card a photo-first link already created, so a
 * picker shown again (a reopened chat) can show that card instead.
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

  // The token is our signed statement of who the user is, so act for them
  // with the service role, scoped to their user id like the Slack bot does.
  if (body.photo === undefined) {
    if (payload.purpose !== "new-card-photo") return json({ card: null })
    const supabase = requireServiceRoleClient()
    const cardId = await findClaimedCard(supabase, payload.nonce)
    if (!cardId) return json({ card: null })
    return cardResponse(supabase, payload.userId, cardId, ALREADY_CREATED)
  }

  if (typeof body.photo !== "string" || !body.photo.startsWith("data:image/")) {
    return json({ error: "Please choose an image file." }, 400)
  }

  const supabase = requireServiceRoleClient()
  return payload.purpose === "new-card-photo"
    ? createCardFromPhoto(supabase, payload, body.photo)
    : redrawCover(supabase, payload, body.photo)
}
