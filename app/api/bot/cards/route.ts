import { NextRequest, NextResponse } from "next/server"
import { verifyBotSecret } from "@/lib/bot-auth"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { createCardForUser } from "@/lib/create-card"

export async function POST(request: NextRequest) {
  if (!verifyBotSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      supabaseUserId,
      cardType,
      recipientName,
      recipientEmail,
      senderName,
      copyHeadline,
      imageUrl,
      extraPages,
    } = body as Record<string, unknown>

    if (
      typeof supabaseUserId !== "string" ||
      typeof cardType !== "string" ||
      typeof recipientName !== "string" ||
      typeof senderName !== "string" ||
      typeof copyHeadline !== "string" ||
      typeof imageUrl !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    const supabase = requireServiceRoleClient()
    const result = await createCardForUser(supabase, supabaseUserId, {
      cardType,
      recipientName,
      recipientEmail:
        typeof recipientEmail === "string" ? recipientEmail : undefined,
      senderName,
      copyHeadline,
      imageUrl,
      extraPages: typeof extraPages === "number" ? extraPages : 0,
    })

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ card: result.card })
  } catch (error) {
    console.error("[bot/cards] error:", error)
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 },
    )
  }
}
