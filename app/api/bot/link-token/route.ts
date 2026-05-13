import { NextRequest, NextResponse } from "next/server"
import { verifyBotSecret } from "@/lib/bot-auth"
import { generateLinkToken } from "@/lib/chat-link-token"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import { getAppUrl } from "@/lib/app-url"

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

    const payload = {
      platform,
      platformUserId,
      platformTeamId:
        typeof platformTeamId === "string" ? platformTeamId : undefined,
    }

    const token = generateLinkToken(payload)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const supabase = requireServiceRoleClient()
    const { error } = await supabase.from("chat_link_tokens").insert({
      token,
      platform: payload.platform,
      platform_user_id: payload.platformUserId,
      platform_team_id: payload.platformTeamId ?? null,
      expires_at: expiresAt,
    })

    if (error) {
      console.error("[bot/link-token] insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const appUrl = getAppUrl()
    const linkPath = resolveSafePostAuthRedirectPath(
      `/auth/link-chat?token=${encodeURIComponent(token)}`,
      "/auth/link-chat",
    )
    const linkUrl = `${appUrl}${linkPath}`

    return NextResponse.json({ token, linkUrl, expiresAt })
  } catch (error) {
    console.error("[bot/link-token] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
