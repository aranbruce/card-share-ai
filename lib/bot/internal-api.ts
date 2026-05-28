import { generateLinkToken } from "@/lib/chat-link-token"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import {
  createCardForUser,
  type CardRow,
  type CreateCardParams,
} from "@/lib/create-card"
import { getAppUrl } from "@/lib/app-url"
import { generateCardHeadline } from "@/lib/generate-card-headline"
import { generateCardCoverImage } from "@/lib/generate-card-image"

export async function findLinkedUser(
  platform: string,
  platformUserId: string,
  platformTeamId: string,
): Promise<string | null> {
  const supabase = requireServiceRoleClient()
  const { data, error } = await supabase
    .from("chat_platform_identities")
    .select("supabase_user_id")
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId)
    .eq("platform_team_id", platformTeamId)
    .maybeSingle()
  if (error) throw new Error(`findLinkedUser: ${error.message}`)
  return data?.supabase_user_id ?? null
}

export async function createLinkUrl(
  platform: string,
  platformUserId: string,
  platformTeamId: string,
): Promise<string> {
  const payload = { platform, platformUserId, platformTeamId }
  const token = generateLinkToken(payload)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const supabase = requireServiceRoleClient()
  const { error } = await supabase.from("chat_link_tokens").insert({
    token,
    platform,
    platform_user_id: platformUserId,
    platform_team_id: platformTeamId,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to store link token: ${error.message}`)
  }

  const appUrl = getAppUrl()
  return `${appUrl}/link-chat?token=${encodeURIComponent(token)}`
}

export async function generateHeadline(params: {
  cardType: string
  recipientName: string
  senderName: string
  customMessage?: string
}): Promise<string> {
  try {
    return await generateCardHeadline(params)
  } catch (err) {
    console.error("[bot/generateHeadline] FAIL:", err)
    return "Wishing you all the best!"
  }
}

export async function generateImageUrl(params: {
  cardType: string
  coverHeadline: string
  customMessage?: string
}): Promise<string> {
  try {
    return await generateCardCoverImage(params)
  } catch (err) {
    console.error("[bot/generateImageUrl] FAIL:", err)
    return ""
  }
}

export async function createBotCard(
  supabaseUserId: string,
  params: CreateCardParams,
): Promise<CardRow | null> {
  const supabase = requireServiceRoleClient()
  const result = await createCardForUser(supabase, supabaseUserId, params)
  if ("error" in result) {
    console.error(`[bot/createCard] FAIL: ${result.error}`)
    return null
  }
  return result.card
}
