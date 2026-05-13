import { NextRequest, NextResponse } from "next/server"
import { verifyBotSecret } from "@/lib/bot-auth"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  if (!verifyBotSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { platform, platformUserId, platformTeamId } = body as Record<
      string,
      unknown
    >

    if (typeof platform !== "string" || typeof platformUserId !== "string") {
      return NextResponse.json(
        { error: "platform and platformUserId are required" },
        { status: 400 },
      )
    }

    const supabase = requireServiceRoleClient()
    const { data, error } = await supabase
      .from("chat_platform_identities")
      .select("supabase_user_id")
      .eq("platform", platform)
      .eq("platform_user_id", platformUserId)
      .eq(
        "platform_team_id",
        typeof platformTeamId === "string" ? platformTeamId : "",
      )
      .maybeSingle()

    if (error) {
      console.error("[bot/identity] lookup error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ linked: false })
    }

    return NextResponse.json({
      linked: true,
      supabaseUserId: data.supabase_user_id,
    })
  } catch (error) {
    console.error("[bot/identity] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
