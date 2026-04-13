import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function quotePostgrestValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const safeId = quotePostgrestValue(id)

    // Share modal links use contributor_link_id; callers may also pass the card row id
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select(
        'id, sent_at, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages',
      )
      .or(`id.eq.${safeId},contributor_link_id.eq.${safeId}`)
      .maybeSingle()

    if (cardError || !cardData) {
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
