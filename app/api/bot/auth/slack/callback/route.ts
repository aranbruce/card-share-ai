import { getBot, getSlackAdapter } from "@/lib/bot"
import { getAppUrl } from "@/lib/app-url"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl()
  const adapter = getSlackAdapter()

  const redirect = (path: string) => {
    const res = NextResponse.redirect(`${appUrl}${path}`)
    res.cookies.delete("slack_oauth_state")
    return res
  }

  const expectedState = request.cookies.get("slack_oauth_state")?.value
  const receivedState = request.nextUrl.searchParams.get("state")
  if (!expectedState || !receivedState || expectedState !== receivedState) {
    console.error("[slack/oauth] state mismatch — possible CSRF")
    return redirect("/slack/installed?error=1")
  }

  try {
    await getBot().initialize()
    const { teamId, installation } = await adapter.handleOAuthCallback(
      request,
      {
        redirectUri: `${appUrl}/api/bot/auth/slack/callback`,
      },
    )
    const team = encodeURIComponent(installation.teamName ?? teamId)
    return redirect(`/slack/installed?team=${team}`)
  } catch (err) {
    console.error("[slack/oauth]", err)
    return redirect("/slack/installed?error=1")
  }
}
