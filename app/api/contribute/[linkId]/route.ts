import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params
    const { message, contributorName } = await request.json()

    if (!message || !contributorName) {
      return NextResponse.json(
        { error: 'Message and contributor name are required' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Get the card by contributor link (no auth needed)
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, status')
      .eq('contributor_link_id', linkId)
      .eq('status', 'collecting')
      .single()

    if (cardError || !cardData) {
      return NextResponse.json(
        { error: 'Card not found or not accepting contributions' },
        { status: 404 },
      )
    }

    // Add contribution
    const { data, error } = await supabase.from('card_contributions').insert({
      card_id: cardData.id,
      contributor_name: contributorName,
      message,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ contribution: data?.[0] })
  } catch (error) {
    console.error('Error adding contribution:', error)
    return NextResponse.json(
      { error: 'Failed to add contribution' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params
    const supabase = await createClient()

    // Get card by contributor link
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, status, copy_headline, copy_message, copy_signoff, image_url')
      .eq('contributor_link_id', linkId)
      .single()

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
      return NextResponse.json({ error: contribError.message }, { status: 400 })
    }

    return NextResponse.json({
      card: cardData,
      contributions,
    })
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 },
    )
  }
}
