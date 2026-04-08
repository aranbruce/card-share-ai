import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] POST /api/cards - Starting card creation')
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('[v0] User check:', user ? `User ID: ${user.id}` : 'No user found')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      cardType,
      recipientName,
      recipientEmail,
      senderName,
      copyHeadline,
      copyMessage,
      imageUrl,
      imagePrompt,
      extraPages = 0,
    } = await request.json()

    console.log('[v0] Card data:', { cardType, recipientName, senderName, hasImage: !!imageUrl })

    // Generate a unique link ID for contributions
    const linkId = uuidv4()

    const { data, error } = await supabase.from('cards').insert({
      user_id: user.id,
      card_type: cardType,
      recipient_name: recipientName,
      recipient_email: recipientEmail || '',
      sender_name: senderName,
      copy_headline: copyHeadline,
      copy_message: copyMessage,
      image_url: imageUrl,
      image_prompt: imagePrompt,
      status: 'draft',
      contributor_link_id: linkId,
      extra_pages: extraPages,
    }).select()

    console.log('[v0] Insert result:', { data, error })

    if (error) {
      console.error('[v0] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      card: data?.[0] || { id: data?.id, contributor_link_id: linkId },
    })
  } catch (error) {
    console.error('[v0] Error creating card:', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ cards: data })
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 },
    )
  }
}
