import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { field, cardType, recipientName, senderName, currentValue, userPrompt } = await request.json()

    if (!field || !cardType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let prompt = ''
    
    if (field === 'headline') {
      prompt = `Generate a single catchy, celebratory headline for a ${cardType} greeting card to ${recipientName} from ${senderName}. 
      
Current headline is: "${currentValue}"

User's request for the change: "${userPrompt}"

Based on the user's request, generate a new headline. Just respond with the headline text only, no quotes or extra formatting.`
    } else if (field === 'message') {
      prompt = `Generate a heartfelt message for a ${cardType} greeting card to ${recipientName} from ${senderName}.

Current message is: "${currentValue}"

User's request for the change: "${userPrompt}"

Based on the user's request, generate a new message that's warm and personal. Include a sign-off at the end. Just respond with the message text only, no extra formatting.`
    } else {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    const { text } = await generateText({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    return NextResponse.json({ text: text.trim() })
  } catch (error) {
    console.error('[v0] Error regenerating text:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to regenerate text', details: errorMessage },
      { status: 500 },
    )
  }
}
