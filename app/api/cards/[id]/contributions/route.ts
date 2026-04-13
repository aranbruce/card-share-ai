import { NextRequest, NextResponse } from "next/server"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import { normalizeContributionTextColor } from "@/lib/contribution-text-color"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import { createClient } from "@/lib/supabase/server"

type OwnsCardResult =
  | { kind: "ok"; card: { id: string } }
  | { kind: "not_found" }
  | { kind: "query_error" }

async function assertOwnsCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardId: string,
): Promise<OwnsCardResult> {
  const { data, error } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[assertOwnsCard]", error)
    return { kind: "query_error" }
  }
  if (!data) return { kind: "not_found" }
  return { kind: "ok", card: data }
}

/** POST — create the single creator contribution (first placed message). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cardId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ownership = await assertOwnsCard(supabase, user.id, cardId)
    if (ownership.kind === "query_error") {
      return NextResponse.json(
        { error: "Failed to verify card" },
        { status: 500 },
      )
    }
    if (ownership.kind === "not_found") {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from("card_contributions")
      .select("id")
      .eq("card_id", cardId)
      .eq("is_creator", true)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: "Creator message already exists; use PATCH to update it." },
        { status: 409 },
      )
    }

    const body = await request.json()
    const message = body.message as unknown
    const positionX = body.positionX as unknown
    const positionY = body.positionY as unknown
    const widthPercent = body.widthPercent as unknown
    const pageIndex = body.pageIndex as unknown
    const fontSize = body.fontSize as unknown
    const textColorRaw = body.textColor as unknown

    const msg = typeof message === "string" ? message.trim() : ""
    if (!msg) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      )
    }

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

    const { data: contribution, error: insertError } = await supabase
      .from("card_contributions")
      .insert({
        card_id: cardId,
        message: msg,
        is_creator: true,
        position_x: typeof positionX === "number" ? positionX : null,
        position_y: typeof positionY === "number" ? positionY : null,
        width_percent: typeof widthPercent === "number" ? widthPercent : null,
        page_index: typeof pageIndex === "number" ? pageIndex : null,
        font_size: typeof fontSize === "number" ? fontSize : null,
        text_color,
      })
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .single()

    if (insertError || !contribution) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create contribution" },
        { status: 400 },
      )
    }

    const { error: mirrorErr } = await supabase
      .from("cards")
      .update({ copy_message: msg, updated_at: new Date().toISOString() })
      .eq("id", cardId)
      .eq("user_id", user.id)
    if (mirrorErr) {
      console.error(
        "[owner POST contributions] mirror copy_message:",
        mirrorErr,
      )
    }

    return NextResponse.json({ contribution })
  } catch (e) {
    console.error("[owner POST contributions]", e)
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 },
    )
  }
}

/** PATCH — update creator contribution (message, layout, page, font). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cardId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ownership = await assertOwnsCard(supabase, user.id, cardId)
    if (ownership.kind === "query_error") {
      return NextResponse.json(
        { error: "Failed to verify card" },
        { status: 500 },
      )
    }
    if (ownership.kind === "not_found") {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const body = await request.json()
    const contributionId = body.contributionId as string | undefined
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

    if (
      !contributionId ||
      (message === undefined &&
        positionX === undefined &&
        positionY === undefined &&
        widthPercent === undefined &&
        pageIndex === undefined &&
        fontSize === undefined &&
        !hasTextColor)
    ) {
      return NextResponse.json(
        {
          error: "contributionId and at least one field to update are required",
        },
        { status: 400 },
      )
    }

    const { data: row, error: fetchErr } = await supabase
      .from("card_contributions")
      .select("id, card_id, is_creator")
      .eq("id", contributionId)
      .maybeSingle()

    if (fetchErr || !row || row.card_id !== cardId || !row.is_creator) {
      return NextResponse.json(
        { error: "Creator contribution not found" },
        { status: 404 },
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
      const textColorRaw = Object.prototype.hasOwnProperty.call(
        body,
        "textColor",
      )
        ? (body as { textColor?: unknown }).textColor
        : (body as { text_color?: unknown }).text_color
      const tc = normalizeContributionTextColor(textColorRaw)
      if (tc === undefined) {
        return NextResponse.json(
          { error: "Invalid text color (use #RRGGBB or null)" },
          { status: 400 },
        )
      }
      updates.text_color = tc
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "contributionId and at least one field to update are required",
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
      return NextResponse.json(
        { error: updateErr?.message ?? "Update failed" },
        { status: 400 },
      )
    }

    if (updates.message !== undefined) {
      const { error: mirrorErr } = await supabase
        .from("cards")
        .update({
          copy_message: updates.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId)
        .eq("user_id", user.id)
      if (mirrorErr) {
        console.error(
          "[owner PATCH contributions] mirror copy_message:",
          mirrorErr,
        )
      }
    }

    return NextResponse.json({ contribution: updated })
  } catch (e) {
    console.error("[owner PATCH contributions]", e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
