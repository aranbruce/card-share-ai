import { NextRequest, NextResponse } from 'next/server'
import * as fal from '@fal-ai/serverless-client'

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imagePrompt } = await request.json()

    if (!imagePrompt) {
      return NextResponse.json({ error: 'Image prompt is required' }, { status: 400 })
    }

    // Generate image using fal.ai with flux model
    type FluxResult = { images?: Array<{ url?: string }> }
    const result = (await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: imagePrompt,
        image_size: 'square_hd',
        num_inference_steps: 25,
        num_images: 1,
      },
    })) as FluxResult

    const imageUrl = result.images?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image generated')
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 },
    )
  }
}
