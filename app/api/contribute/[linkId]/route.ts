import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import { normalizeContributionTextColor } from "@/lib/contribution-text-color"
import { normalizeContributionRotationDegrees } from "@/lib/contribution-rotation"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import { compactCardPages } from "@/lib/compact-card-pages"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

function tokensMatch(stored: string, provided: string): boolean {
  try {
    const a = Buffer.from(stored, "utf8")
    const b = Buffer.from(provided, "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params
    const body = await request.json()
    const message = body.message as unknown
    const positionX = body.positionX as unknown
    const positionY = body.positionY as unknown
    const widthPercent = body.widthPercent as unknown
    const pageIndex = body.pageIndex as unknown
    const fontSize = body.fontSize as unknown
    const textColorRaw = body.textColor as unknown
    const rotationDegreesRaw = (body.rotationDegrees ??
      body.rotation_degrees) as unknown

    const msg = typeof message === "string" ? message.trim() : ""
    if (!msg) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      )
    }

    const supabase = requireServiceRoleClient()

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("id")
      .eq("contributor_link_id", linkId)
      .maybeSingle()

    if (cardError) {
      console.error("[contribute POST] card lookup:", cardError)
      return NextResponse.json({ error: cardError.message }, { status: 500 })
    }

    if (!cardData) {
      return NextResponse.json(
        {
          error: "This card is not accepting new messages.",
        },
        { status: 404 },
      )
    }

    const editToken = uuidv4()

    let text_color: string | null
    if (textColorRaw === undefined) {
      text_color = randomPresetTextColor()
    } else {
      const tc = normalizeContributionTextColor(textColorRaw)
      if (tc === undefined) {
        return NextResponse.json(
          { error: "Invalid text color (use #RRGGBB or null)" },
          { status: 400 },
        )
      }
      text_color = tc
    }

    const rotation_degrees =
      normalizeContributionRotationDegrees(rotationDegreesRaw)
    if (rotation_degrees === undefined && rotationDegreesRaw !== undefined) {
      return NextResponse.json(
        { error: "Invalid rotation (use a number or null)" },
        { status: 400 },
      )
    }

    const { data: contribution, error: insertError } = await supabase
      .from("card_contributions")
      .insert({
        card_id: cardData.id,
        message: msg,
        is_creator: false,
        edit_token: editToken,
        position_x: typeof positionX === "number" ? positionX : null,
        position_y: typeof positionY === "number" ? positionY : null,
        width_percent: typeof widthPercent === "number" ? widthPercent : null,
        page_index: typeof pageIndex === "number" ? pageIndex : null,
        font_size: typeof fontSize === "number" ? fontSize : null,
        text_color,
        rotation_degrees: rotation_degrees ?? null,
      })
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .single()

    if (insertError || !contribution) {
      console.error("[contribute POST] insert:", insertError)
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save message" },
        { status: 400 },
      )
    }

    // editToken is only ever returned here — not in GET — so only the browser that added the message can PATCH.
    try {
      const { contributions, extra_pages } = await compactCardPages(supabase, cardData.id)
      const compactedContribution =
        contributions.find((item) => item.id === contribution.id) ?? contribution
      return NextResponse.json({ contribution: compactedContribution, editToken, contributions, extra_pages })
    } catch (compactErr) {
      console.error("[contribute POST] compactCardPages:", compactErr)
      return NextResponse.json({ contribution, editToken })
    }
  } catch (error) {
    console.error("Error adding contribution:", error)
    return NextResponse.json(
      { error: "Failed to add contribution" },
      { status: 500 },
    )
  }
}

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params
    const body = await request.json()

    if (body.action === "add_page") {
      const supabase = requireServiceRoleClient()
      const { data: next, error: rpcError } = await supabase.rpc(
        "increment_extra_pages",
        { card_link_id: linkId },
      )
      if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 })
      }
      if (next === null) {
        // NULL means either the card doesn't exist or extra_pages is already at
        // the cap (10). A follow-up lookup tells us which.
        const { data: card, error: cardLookupError } = await supabase
          .from("cards")
          .select("extra_pages")
          .eq("contributor_link_id", linkId)
          .maybeSingle()
        if (cardLookupError) {
          return NextResponse.json({ error: cardLookupError.message }, { status: 500 })
        }
        if (!card) {
          return NextResponse.json({ error: "Card not found" }, { status: 404 })
        }
        return NextResponse.json(
          { error: "Maximum number of pages reached", extra_pages: card.extra_pages },
          { status: 409 },
        )
      }
      return NextResponse.json({ extra_pages: next })
    }

    const contributionId = body.contributionId as string | undefined
    const editToken = body.editToken as string | undefined
    const message = body.message as string | undefined
    const positionX = (body.positionX ?? body.position_x) as number | undefined
    const positionY = (body.positionY ?? body.position_y) as number | undefined
    const widthPercent = (body.widthPercent ?? body.width_percent) as
      | number
      | undefined
    const pageIndex = (body.pageIndex ?? body.page_index) as number | undefined
    const fontSize = (body.fontSize ?? body.font_size) as number | undefined
    const hasTextColor =
      Object.prototype.hasOwnProperty.call(body, "textColor") ||
      Object.prototype.hasOwnProperty.call(body, "text_color")
    const hasRotationDegrees =
      Object.prototype.hasOwnProperty.call(body, "rotationDegrees") ||
      Object.prototype.hasOwnProperty.call(body, "rotation_degrees")

    if (
      !contributionId ||
      typeof editToken !== "string" ||
      !editToken.trim() ||
      (message === undefined &&
        positionX === undefined &&
        positionY === undefined &&
        widthPercent === undefined &&
        pageIndex === undefined &&
        fontSize === undefined &&
        !hasTextColor &&
        !hasRotationDegrees)
    ) {
      return NextResponse.json(
        {
          error:
            "contributionId, editToken, and at least one updatable field are required",
        },
        { status: 400 },
      )
    }

    const supabase = requireServiceRoleClient()

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("id")
      .eq("contributor_link_id", linkId)
      .maybeSingle()

    if (cardError) {
      console.error("[contribute PATCH] card lookup:", cardError)
      return NextResponse.json({ error: cardError.message }, { status: 500 })
    }

    if (!cardData) {
      return NextResponse.json(
        { error: "Card not found or not accepting edits" },
        { status: 404 },
      )
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("card_contributions")
      .select("id, card_id, created_at, edit_token")
      .eq("id", contributionId)
      .maybeSingle()

    if (fetchErr || !existing || existing.card_id !== cardData.id) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 },
      )
    }

    if (
      !existing.edit_token ||
      !tokensMatch(existing.edit_token, editToken.trim())
    ) {
      return NextResponse.json(
        { error: "You can only edit messages you added from this device." },
        { status: 403 },
      )
    }

    const created = new Date(existing.created_at).getTime()
    if (Number.isFinite(created) && Date.now() - created > EDIT_WINDOW_MS) {
      return NextResponse.json(
        {
          error: "This message can no longer be edited (editing window ended).",
        },
        { status: 403 },
      )
    }

    const updates: {
      message?: string
      position_x?: number
      position_y?: number
      width_percent?: number
      page_index?: number
      font_size?: number
      text_color?: string | null
      rotation_degrees?: number | null
    } = {}
    if (typeof message === "string") {
      const msg = message.trim()
      if (!msg) {
        return NextResponse.json(
          { error: "Message is required" },
          { status: 400 },
        )
      }
      updates.message = msg
    }
    if (typeof positionX === "number") updates.position_x = positionX
    if (typeof positionY === "number") updates.position_y = positionY
    if (typeof widthPercent === "number") updates.width_percent = widthPercent
    if (typeof pageIndex === "number") updates.page_index = pageIndex
    if (typeof fontSize === "number") updates.font_size = fontSize
    if (hasTextColor) {
      const rawTextColor =
        body.textColor !== undefined ? body.textColor : body.text_color
      const tc = normalizeContributionTextColor(rawTextColor)
      if (tc === undefined) {
        return NextResponse.json(
          { error: "Invalid text color (use #RRGGBB or null)" },
          { status: 400 },
        )
      }
      updates.text_color = tc
    }
    if (hasRotationDegrees) {
      const rotationRaw =
        body.rotationDegrees !== undefined
          ? body.rotationDegrees
          : body.rotation_degrees
      const rotation = normalizeContributionRotationDegrees(rotationRaw)
      if (rotation === undefined) {
        return NextResponse.json(
          { error: "Invalid rotation (use a number or null)" },
          { status: 400 },
        )
      }
      updates.rotation_degrees = rotation
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error:
            "contributionId, editToken, and at least one updatable field are required",
        },
        { status: 400 },
      )
    }

    const { data: updated, error: updateErr } = await supabase
      .from("card_contributions")
      .update(updates)
      .eq("id", contributionId)
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .single()

    if (updateErr || !updated) {
      console.error("[contribute PATCH] update:", updateErr)
      return NextResponse.json(
        { error: updateErr?.message ?? "Update failed" },
        { status: 400 },
      )
    }

    try {
      const { contributions, extra_pages } = await compactCardPages(supabase, cardData.id)
      const compactedContribution =
        contributions.find((item) => item.id === updated.id) ?? updated
      return NextResponse.json({ contribution: compactedContribution, contributions, extra_pages })
    } catch (compactErr) {
      console.error("[contribute PATCH] compactCardPages:", compactErr)
      return NextResponse.json({ contribution: updated })
    }
  } catch (error) {
    console.error("Error updating contribution:", error)
    return NextResponse.json(
      { error: "Failed to update contribution" },
      { status: 500 },
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params
    const supabase = requireServiceRoleClient()

    // Get card by contributor link
    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select(
        "id, sent_at, card_type, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages",
      )
      .eq("contributor_link_id", linkId)
      .maybeSingle()

    if (cardError || !cardData) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // Get contributions for this card
    const { data: contributions, error: contribError } = await supabase
      .from("card_contributions")
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .eq("card_id", cardData.id)
      .order("created_at", { ascending: true })

    if (contribError) {
      console.error(
        "[GET /api/contribute/[linkId]] contributions:",
        contribError,
      )
      return NextResponse.json({ card: cardData, contributions: [] })
    }

    return NextResponse.json({
      card: cardData,
      contributions: contributions ?? [],
    })
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 })
  }
}
