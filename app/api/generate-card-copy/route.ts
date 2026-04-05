import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const cardCopySchema = z.object({
  headline: z.string().describe('A catchy, celebratory headline for the card'),
  message: z.string().describe('The main message body of the card'),
  signoff: z.string().describe('A warm closing/signature line'),
  imagePrompt: z.string().describe('A detailed prompt for generating the card image'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cardType, recipientName, senderName, customMessage } = await request.json()

    if (!cardType || !recipientName || !senderName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = `You are a creative greeting card writer. Generate heartfelt, personalized greeting card copy for a ${cardType} card.
    
The card is from: ${senderName}
To: ${recipientName}
${customMessage ? `Additional context: ${customMessage}` : ''}

Create warm, appropriate copy that matches the card type. The image prompt should be descriptive for AI image generation.`

    const { output } = await generateText({
      model: 'openai/gpt-4o',
      output: Output.object({
        schema: cardCopySchema,
      }),
      messages: [
        {
          role: 'user',
          content: `Please create greeting card copy for a ${cardType} card to ${recipientName} from ${senderName}. ${customMessage ? `Additional context: ${customMessage}` : ''}`,
        },
      ],
      system: systemPrompt,
    })

    return NextResponse.json({ cardCopy: output })
  } catch (error) {
    console.error('Error generating card copy:', error)
    return NextResponse.json(
      { error: 'Failed to generate card copy' },
      { status: 500 },
    )
  }
}
