import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/app-url"
import {
  sendContributorInviteEmail,
  sendRecipientCardEmail,
} from "@/lib/email/resend"

const bodySchema = z.object({
  kind: z.enum(["recipient", "contributor"]),
  email: z.string().trim().email(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, recipient_name, sender_name, recipient_email, contributor_link_id, sent_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }
    if (!card.contributor_link_id) {
      return NextResponse.json(
        { error: "Card link is unavailable" },
        { status: 400 },
      )
    }

    const baseUrl = getAppUrl()
    const destinationEmail = parsed.data.email.trim()

    if (parsed.data.kind === "recipient") {
      const recipientName = (card.recipient_name ?? "there").trim()
      const senderName = (card.sender_name ?? "Someone").trim()
      const link = `${baseUrl}/view/${card.contributor_link_id}`

      const sendResult = await sendRecipientCardEmail({
        to: destinationEmail,
        recipientName,
        senderName,
        link,
      })
      if (!sendResult.ok) {
        return NextResponse.json({ error: sendResult.error }, { status: 500 })
      }

      const updates: Record<string, string> = {
        recipient_email: destinationEmail,
        updated_at: new Date().toISOString(),
      }
      if (!card.sent_at) updates.sent_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
      if (updateError) {
        console.error("[POST /api/cards/[id]/send-email] card update:", updateError)
      }

      return NextResponse.json({
        ok: true,
        sentAt: updates.sent_at ?? card.sent_at,
      })
    }

    const recipientName = (card.recipient_name ?? "your recipient").trim()
    const senderName = (card.sender_name ?? "Someone").trim()
    const link = `${baseUrl}/contribute/${card.contributor_link_id}`

    const sendResult = await sendContributorInviteEmail({
      to: destinationEmail,
      recipientName,
      senderName,
      link,
    })
    if (!sendResult.ok) {
      return NextResponse.json({ error: sendResult.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[POST /api/cards/[id]/send-email]:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
