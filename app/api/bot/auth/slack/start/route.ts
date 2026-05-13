import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/app-url"

const SCOPES = [
  "chat:write",
  "chat:write.public",
  "commands",
  "im:history",
  "im:write",
  "users:read",
].join(",")

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
  if (!clientId) {
    return new Response("NEXT_PUBLIC_SLACK_CLIENT_ID is not configured", {
      status: 500,
    })
  }
  const appUrl = getAppUrl()
  const redirectUri = `${appUrl}/api/bot/auth/slack/callback`
  const state = randomBytes(32).toString("hex")

  const url = new URL("https://slack.com/oauth/v2/authorize")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("scope", SCOPES)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)

  const response = NextResponse.redirect(url.toString())
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  })
  return response
}
