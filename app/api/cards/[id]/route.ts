import { NextRequest, NextResponse } from "next/server"
import { hasUnusedStoredExtraPages } from "@/lib/card-extra-pages"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import { createClient } from "@/lib/supabase/server"

function extractAllowedCardUpdates(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }

  const body = raw as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  if (typeof body.card_type === "string") updates.card_type = body.card_type
  if (typeof body.recipient_name === "string")
    updates.recipient_name = body.recipient_name
  if (typeof body.recipient_email === "string")
    updates.recipient_email = body.recipient_email
  if (typeof body.sender_name === "string")
    updates.sender_name = body.sender_name
  if (typeof body.copy_headline === "string")
    updates.copy_headline = body.copy_headline
  if (typeof body.copy_message === "string")
    updates.copy_message = body.copy_message
  if (typeof body.image_url === "string") updates.image_url = body.image_url
  if (
    typeof body.extra_pages === "number" &&
    Number.isFinite(body.extra_pages) &&
    body.extra_pages >= 0
  ) {
    updates.extra_pages = Math.trunc(body.extra_pages)
  }
  if (typeof body.sent_at === "string" && body.sent_at.trim()) {
    updates.sent_at = body.sent_at
  }

  return updates
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use * so older DBs without newer columns still return the card; an explicit column
    // list 400s when the schema lags migrations.
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // Public columns only (omits edit_token). Requires migrations that add listed columns.
    const { data: contributions, error: contribErr } = await supabase
      .from("card_contributions")
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .eq("card_id", id)
      .order("created_at", { ascending: true })

    if (contribErr) {
      console.error("[GET /api/cards/[id]] contributions:", contribErr)
      return NextResponse.json({
        card: data,
        contributions: [],
        contributionsLoaded: false,
      })
    }

    return NextResponse.json({
      card: data,
      contributions: contributions ?? [],
      contributionsLoaded: true,
    })
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = extractAllowedCardUpdates(await request.json())
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 },
      )
    }

    if (
      "sent_at" in updates &&
      typeof updates.sent_at === "string" &&
      updates.sent_at.trim()
    ) {
      const { data: existing, error: sentCheckError } = await supabase
        .from("cards")
        .select("sent_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (sentCheckError) {
        console.error("[PATCH /api/cards/[id]] sent_at check:", sentCheckError)
        return NextResponse.json(
          { error: "Could not verify card send state" },
          { status: 500 },
        )
      }
      if (existing?.sent_at) {
        delete updates.sent_at
        if (Object.keys(updates).length === 0) {
          const { data: currentCard, error: currentCardError } = await supabase
            .from("cards")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle()
          if (currentCardError || !currentCard) {
            return NextResponse.json(
              { error: "Card not found" },
              { status: 404 },
            )
          }
          return NextResponse.json({ card: currentCard })
        }
      }
    }

    const { data, error } = await supabase
      .from("cards")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const cardRow = data?.[0]
    if (!cardRow) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }
    if (cardRow && typeof updates.copy_message === "string") {
      const { error: syncErr } = await supabase
        .from("card_contributions")
        .update({ message: updates.copy_message })
        .eq("card_id", id)
        .eq("is_creator", true)
      if (syncErr) {
        console.error("[PATCH /api/cards] sync creator contribution:", syncErr)
      }
    }

    let responseCard = cardRow
    if (!("extra_pages" in updates)) {
      const storedExtra =
        typeof cardRow.extra_pages === "number" && cardRow.extra_pages > 0
          ? cardRow.extra_pages
          : 0
      if (storedExtra > 0) {
        const { data: rows, error: contribErr } = await supabase
          .from("card_contributions")
          .select(CONTRIBUTION_PUBLIC_COLUMNS)
          .eq("card_id", id)
          .order("created_at", { ascending: true })
        if (!contribErr && rows && rows.length > 0) {
          if (hasUnusedStoredExtraPages(storedExtra, rows)) {
            const { data: trimmed, error: trimErr } = await supabase
              .from("cards")
              .update({
                extra_pages: 0,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id)
              .eq("user_id", user.id)
              .select()
              .single()
            if (trimErr) {
              console.error("[PATCH /api/cards/[id]] trim extra_pages:", trimErr)
            } else if (trimmed) {
              responseCard = trimmed
            } else {
              responseCard = { ...cardRow, extra_pages: 0 }
            }
          }
        }
      }
    }

    return NextResponse.json({ card: responseCard })
  } catch (error) {
    console.error("Error updating card:", error)
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting card:", error)
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 },
    )
  }
}
