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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { token } = body

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

    // Atomically claim the token before touching identity data. The WHERE
    // used_at IS NULL guard means only one concurrent request can succeed;
    // any racing request gets an empty data array and returns 400.
    // Using .select() rather than { count: "exact" } because PostgREST can
    // return a null count when no Content-Range header is present.
    const { data: claimedRows, error: markUsedError } = await serviceSupabase
      .from("chat_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token)
      .is("used_at", null)
      .select("token")

    if (markUsedError) {
      console.error("[bot/link] mark token used:", markUsedError)
      return NextResponse.json(
        { error: markUsedError.message },
        { status: 500 },
      )
    }

    if (!claimedRows || claimedRows.length === 0) {
      return NextResponse.json(
        { error: "This link has already been used" },
        { status: 400 },
      )
    }

    const { error: upsertError } = await serviceSupabase
      .from("chat_platform_identities")
      .upsert(
        {
          supabase_user_id: user.id,
          platform: tokenRow.platform,
          platform_user_id: tokenRow.platform_user_id,
          platform_team_id: tokenRow.platform_team_id ?? "",
        },
        { onConflict: "platform,platform_user_id,platform_team_id" },
      )

    if (upsertError) {
      console.error("[bot/link] upsert identity:", upsertError)
      // Revert the token claim so the user can retry with the same link
      const { error: revertError } = await serviceSupabase
        .from("chat_link_tokens")
        .update({ used_at: null })
        .eq("token", token)
      if (revertError) {
        console.error("[bot/link] revert token claim:", revertError)
      }
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, platform: tokenRow.platform })
  } catch (error) {
    console.error("[bot/link] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
