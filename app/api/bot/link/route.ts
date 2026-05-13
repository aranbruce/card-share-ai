import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { verifyLinkToken } from "@/lib/chat-link-token"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body as Record<string, unknown>

    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 })
    }

    const serviceSupabase = requireServiceRoleClient()
    const { data: tokenRow, error: tokenError } = await serviceSupabase
      .from("chat_link_tokens")
      .select(
        "platform, platform_user_id, platform_team_id, expires_at, used_at",
      )
      .eq("token", token)
      .maybeSingle()

    if (tokenError) {
      console.error("[bot/link] token lookup:", tokenError)
      return NextResponse.json({ error: tokenError.message }, { status: 500 })
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 400 },
      )
    }

    if (tokenRow.used_at) {
      return NextResponse.json(
        { error: "This link has already been used" },
        { status: 400 },
      )
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 400 },
      )
    }

    const valid = verifyLinkToken(token, {
      platform: tokenRow.platform,
      platformUserId: tokenRow.platform_user_id,
      platformTeamId: tokenRow.platform_team_id ?? undefined,
    })

    if (!valid) {
      return NextResponse.json({ error: "Invalid link token" }, { status: 400 })
    }

    await serviceSupabase
      .from("chat_platform_identities")
      .delete()
      .eq("platform", tokenRow.platform)
      .eq("platform_user_id", tokenRow.platform_user_id)

    const { error: insertError } = await serviceSupabase
      .from("chat_platform_identities")
      .insert({
        supabase_user_id: user.id,
        platform: tokenRow.platform,
        platform_user_id: tokenRow.platform_user_id,
        platform_team_id: tokenRow.platform_team_id ?? null,
      })

    if (insertError) {
      console.error("[bot/link] insert identity:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await serviceSupabase
      .from("chat_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token)

    return NextResponse.json({ success: true, platform: tokenRow.platform })
  } catch (error) {
    console.error("[bot/link] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
