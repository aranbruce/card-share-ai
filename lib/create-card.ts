import { v4 as uuidv4 } from "uuid"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface CreateCardParams {
  cardType: string
  recipientName: string
  recipientEmail?: string
  senderName: string
  copyHeadline: string
  imageUrl: string
  extraPages?: number
}

export async function createCardForUser(
  supabase: SupabaseClient,
  userId: string,
  params: CreateCardParams,
): Promise<{ card: Record<string, unknown> } | { error: string }> {
  const {
    cardType,
    recipientName,
    recipientEmail,
    senderName,
    copyHeadline,
    imageUrl,
    extraPages = 0,
  } = params

  const linkId = uuidv4()

  const { data, error } = await supabase
    .from("cards")
    .insert({
      user_id: userId,
      card_type: cardType,
      recipient_name: recipientName,
      recipient_email: recipientEmail || "",
      sender_name: senderName,
      copy_headline: copyHeadline,
      copy_message: "",
      image_url: imageUrl,
      contributor_link_id: linkId,
      extra_pages:
        typeof extraPages === "number" && Number.isFinite(extraPages)
          ? extraPages
          : 0,
    })
    .select()
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Failed to create card" }
  }

  const { error: contribError } = await supabase
    .from("card_contributions")
    .insert({
      card_id: data.id,
      is_creator: true,
      message: null,
      position_x: null,
      position_y: null,
      width_percent: null,
      page_index: null,
      font_size: 16,
      text_color: null,
      rotation_degrees: 0,
    })

  if (contribError) {
    console.error("Failed to pre-create creator contribution:", contribError)
  }

  return { card: data }
}
