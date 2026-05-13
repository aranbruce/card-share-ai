import { getBot, getSlackAdapter } from "@/lib/bot"
import { getAppUrl } from "@/lib/app-url"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl()
  const adapter = getSlackAdapter()

  try {
    await getBot().initialize()
    const { teamId, installation } = await adapter.handleOAuthCallback(
      request,
      {
        redirectUri: `${appUrl}/api/bot/auth/slack/callback`,
      },
    )
    const team = encodeURIComponent(installation.teamName ?? teamId)
    return NextResponse.redirect(`${appUrl}/slack/installed?team=${team}`)
  } catch (err) {
    console.error("[slack/oauth]", err)
    return NextResponse.redirect(`${appUrl}/slack/installed?error=1`)
  }
}
