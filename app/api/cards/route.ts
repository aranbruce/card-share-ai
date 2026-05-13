import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCardForUser } from "@/lib/create-card"

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

    const result = await createCardForUser(supabase, user.id, {
      cardType,
      recipientName,
      recipientEmail,
      senderName,
      copyHeadline,
      imageUrl,
      extraPages,
    })

    if ("error" in result) {
      console.error("Error creating card:", result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ card: result.card })
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
