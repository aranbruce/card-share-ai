import { NextRequest, NextResponse } from "next/server"
import { validate as isValidUuid } from "uuid"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

const CARD_VIEW_SELECT =
  "id, sent_at, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  void request
  try {
    const { id: linkId } = await params
    if (!isValidUuid(linkId)) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const supabase = requireServiceRoleClient()

    // Public view endpoints accept only contributor_link_id values.
    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select(CARD_VIEW_SELECT)
      .eq("contributor_link_id", linkId)
      .maybeSingle()

    if (cardError) {
      console.error("[GET /api/cards/view/[id]] card by link:", cardError)
      return NextResponse.json(
        { error: "Failed to fetch card" },
        { status: 500 },
      )
    }

    if (!cardData) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // Get contributions for this card
    const { data: contributions, error: contribError } = await supabase
      .from("card_contributions")
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .eq("card_id", cardData.id)
      .order("created_at", { ascending: true })

    if (contribError) {
      console.error("[GET /api/cards/view/[id]] contributions:", contribError)
      return NextResponse.json({ card: cardData, contributions: [] })
    }

    return NextResponse.json({
      card: cardData,
      contributions: contributions || [],
    })
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 })
  }
}
