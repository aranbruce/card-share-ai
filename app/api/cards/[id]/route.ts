import { NextRequest, NextResponse } from 'next/server'
import { CONTRIBUTION_PUBLIC_COLUMNS } from '@/lib/contribution-public-columns'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use * so older DBs without newer columns still return the card; an explicit column
    // list 400s when the schema lags migrations.
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Public columns only (omits edit_token). Requires migrations that add listed columns.
    const { data: contributions, error: contribErr } = await supabase
      .from('card_contributions')
      .select(CONTRIBUTION_PUBLIC_COLUMNS)
      .eq('card_id', id)
      .order('created_at', { ascending: true })

    if (contribErr) {
      console.error('[GET /api/cards/[id]] contributions:', contribErr)
      return NextResponse.json({ card: data, contributions: [] })
    }

    return NextResponse.json({ card: data, contributions: contributions ?? [] })
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
  }
}

export async function PATCH(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await request.json()
    const updates: Record<string, unknown> =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...(raw as Record<string, unknown>) }
        : {}

    // Removed column; ignore legacy clients.
    delete updates.status

    if (
      'sent_at' in updates &&
      typeof updates.sent_at === 'string' &&
      updates.sent_at.trim()
    ) {
      const { data: existing, error: sentCheckError } = await supabase
        .from('cards')
        .select('sent_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (sentCheckError) {
        console.error('[PATCH /api/cards/[id]] sent_at check:', sentCheckError)
        return NextResponse.json(
          { error: 'Could not verify card send state' },
          { status: 500 },
        )
      }
      if (existing?.sent_at) {
        delete updates.sent_at
      }
    }

    const { data, error } = await supabase
      .from('cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const cardRow = data?.[0]
    if (cardRow && typeof updates.copy_message === 'string') {
      const { error: syncErr } = await supabase
        .from('card_contributions')
        .update({ message: updates.copy_message })
        .eq('card_id', id)
        .eq('is_creator', true)
      if (syncErr) {
        console.error('[PATCH /api/cards] sync creator contribution:', syncErr)
      }
    }

    return NextResponse.json({ card: cardRow })
  } catch (error) {
    console.error('Error updating card:', error)
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 },
    )
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 },
    )
  }
}
