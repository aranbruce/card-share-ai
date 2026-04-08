import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    console.log('[v0] GET /api/cards/view - Card ID:', id)

    // Get card by ID (public access for sent cards)
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, status, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages')
      .eq('id', id)
      .single()

    console.log('[v0] Card query result:', { cardData, cardError })

    if (cardError || !cardData) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Get contributions for this card
    const { data: contributions, error: contribError } = await supabase
      .from('card_contributions')
      .select('id, contributor_name, message, created_at')
      .eq('card_id', cardData.id)
      .order('created_at', { ascending: true })

    if (contribError) {
      console.error('[v0] Contributions error:', contribError)
      return NextResponse.json({ error: contribError.message }, { status: 400 })
    }

    return NextResponse.json({
      card: cardData,
      contributions: contributions || [],
    })
  } catch (error) {
    console.error('[v0] Error fetching card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    )
  }
}
