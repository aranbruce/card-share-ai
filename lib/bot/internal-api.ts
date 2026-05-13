import { generateLinkToken } from "@/lib/chat-link-token"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { createCardForUser, type CreateCardParams } from "@/lib/create-card"
import { getAppUrl } from "@/lib/app-url"

export async function findLinkedUser(
  platform: string,
  platformUserId: string,
): Promise<string | null> {
  const supabase = requireServiceRoleClient()
  const { data } = await supabase
    .from("chat_platform_identities")
    .select("supabase_user_id")
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId)
    .maybeSingle()
  return data?.supabase_user_id ?? null
}

export async function createLinkUrl(
  platform: string,
  platformUserId: string,
): Promise<string> {
  const payload = { platform, platformUserId }
  const token = generateLinkToken(payload)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const supabase = requireServiceRoleClient()
  await supabase.from("chat_link_tokens").insert({
    token,
    platform,
    platform_user_id: platformUserId,
    platform_team_id: null,
    expires_at: expiresAt,
  })

  const appUrl = getAppUrl()
  return `${appUrl}/auth/link-chat?token=${encodeURIComponent(token)}`
}

export async function generateHeadline(params: {
  cardType: string
  recipientName: string
  senderName: string
  customMessage?: string
}): Promise<string> {
  const appUrl = getAppUrl()
  try {
    const res = await fetch(`${appUrl}/api/generate-card-copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    return (data.cardCopy?.headline as string) || "Wishing you all the best!"
  } catch {
    return "Wishing you all the best!"
  }
}

export async function generateImageUrl(params: {
  cardType: string
  coverHeadline: string
  customMessage?: string
}): Promise<string> {
  const appUrl = getAppUrl()
  try {
    const res = await fetch(`${appUrl}/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    return (data.imageUrl as string) || ""
  } catch {
    return ""
  }
}

export async function createBotCard(
  supabaseUserId: string,
  params: CreateCardParams,
): Promise<Record<string, unknown> | null> {
  const supabase = requireServiceRoleClient()
  const result = await createCardForUser(supabase, supabaseUserId, params)
  if ("error" in result) {
    console.error(`[bot/createCard] FAIL: ${result.error}`)
    return null
  }
  return result.card
}
