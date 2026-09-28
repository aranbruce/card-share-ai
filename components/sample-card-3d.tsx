"use client"

import { CardBook3D } from "@/components/card-book-3d"
import { MessageFontVariables } from "@/components/message-font-variables"
import type { Contribution } from "@/lib/card-body"

export type SampleNote = { message: string; font: string; color: string }

/** Where each sample note sits on the inside right page (page pixels, see page-painter). */
const NOTE_SLOTS = [
  { x: 20, y: 40, rotation: -3 },
  { x: 150, y: 190, rotation: 2 },
  { x: 30, y: 330, rotation: -1 },
]

/**
 * A made-up card shown as the real interactive 3D card (cover, opening note and a few
 * signatures inside), so visitors can open it and flip through like a recipient.
 */
export function SampleCard3D({
  id,
  imageUrl,
  headline,
  recipientName,
  message,
  notes,
  showPager = true,
  frameClassName,
  className,
}: {
  /** Keys the sample notes. */
  id: string
  imageUrl: string
  headline: string
  recipientName: string
  message: string
  notes: readonly SampleNote[]
  showPager?: boolean
  frameClassName?: string
  className?: string
}) {
  const contributions: Contribution[] = notes.map((note, i) => {
    const slot = NOTE_SLOTS[i % NOTE_SLOTS.length]
    return {
      id: `${id}-note-${i}`,
      message: note.message,
      created_at: "2026-01-01T00:00:00.000Z",
      page_index: 2,
      position_x: slot.x,
      position_y: slot.y,
      width_percent: 60,
      font_size: 22,
      rotation_degrees: slot.rotation,
      text_color: note.color,
      font_family: note.font,
    }
  })

  return (
    <MessageFontVariables className={className ?? "w-full"}>
      <CardBook3D
        imageUrl={imageUrl}
        headline={headline}
        message={message}
        recipientName={recipientName}
        contributions={contributions}
        showPager={showPager}
        frameClassName={frameClassName}
      />
    </MessageFontVariables>
  )
}
