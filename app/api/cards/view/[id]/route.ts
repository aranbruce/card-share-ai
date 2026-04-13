import { NextRequest, NextResponse } from 'next/server'
import { validate as isValidUuid } from 'uuid'
import { createClient } from '@/lib/supabase/server'

const CARD_VIEW_SELECT =
  'id, sent_at, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Share modal links use contributor_link_id; callers may also pass the card row id
    let { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select(CARD_VIEW_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (cardError) {
      console.error('[GET /api/cards/view/[id]] card by id:', cardError)
      return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
    }

    if (!cardData) {
      const byLink = await supabase
        .from('cards')
        .select(CARD_VIEW_SELECT)
        .eq('contributor_link_id', id)
        .maybeSingle()
      cardData = byLink.data
      if (byLink.error) {
        console.error('[GET /api/cards/view/[id]] card by link:', byLink.error)
        return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
      }
    }

    if (!cardData) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Get contributions for this card
    const { data: contributions, error: contribError } = await supabase
      .from('card_contributions')
      .select('*')
      .eq('card_id', cardData.id)
      .order('created_at', { ascending: true })

    if (contribError) {
      console.error('[GET /api/cards/view/[id]] contributions:', contribError)
      return NextResponse.json({ card: cardData, contributions: [] })
    }

    return NextResponse.json({
      card: cardData,
      contributions: contributions || [],
    })
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
  }
}
