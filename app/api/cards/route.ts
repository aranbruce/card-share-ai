import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      cardType,
      recipientName,
      recipientEmail,
      senderName,
      copyHeadline,
      imageUrl,
      extraPages = 0,
    } = await request.json()

    // Generate a unique link ID for contributions
    const linkId = uuidv4()

    const { data, error } = await supabase
      .from("cards")
      .insert({
        user_id: user.id,
        card_type: cardType,
        recipient_name: recipientName,
        recipient_email: recipientEmail || "",
        sender_name: senderName,
        copy_headline: copyHeadline,
        copy_message: "",
        image_url: imageUrl,
        contributor_link_id: linkId,
        extra_pages:
          typeof extraPages === "number" && Number.isFinite(extraPages)
            ? extraPages
            : 0,
      })
      .select()
      .single()

    if (error || !data) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: error?.message ?? "Failed to create card" },
        { status: 400 },
      )
    }

    // Pre-create an empty creator contribution so the owner studio is ready immediately.
    const { error: contribError } = await supabase
      .from("card_contributions")
      .insert({
        card_id: data.id,
        is_creator: true,
        message: null,
        position_x: null,
        position_y: null,
        width_percent: null,
        page_index: null,
        font_size: 16,
        text_color: null,
        rotation_degrees: 0,
      })
    if (contribError) {
      console.error("Failed to pre-create creator contribution:", contribError)
      // Non-fatal — the studio will create it lazily if missing.
    }

    return NextResponse.json({
      card: data,
    })
  } catch (error) {
    console.error("Error creating card:", error)
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ cards: data })
  } catch (error) {
    console.error("Error fetching cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 },
    )
  }
}
