"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import type { CardBook3DProps } from "@/components/card-book-3d"
import { CardBook3DPlaceholder } from "@/components/card-book-3d/placeholder"
import { MessageFontVariables } from "@/components/message-font-variables"
import type { Contribution } from "@/lib/card-body"

export type SampleNote = { message: string; font: string; color: string }

/** Where each sample note sits on the inside right page (page pixels, see page-painter). */
const NOTE_SLOTS = [
  { x: 20, y: 40, rotation: -3 },
  { x: 150, y: 190, rotation: 2 },
  { x: 30, y: 330, rotation: -1 },
]

type Loaded = ComponentType<CardBook3DProps>

/** How long the freshly loaded card rests closed before a tap that loaded it opens it. */
const OPEN_AFTER_LOAD_MS = 350

/**
 * Loads the 3D card (and `three`, whose start-up blocks the main thread for a while on
 * phones) only when it's wanted. With a mouse, that's once the card is near the screen and
 * the browser is idle, or on hover. On touch screens it waits for a tap on the card, then
 * opens it, so phones paint and respond without the 3D work. Until then the same closed
 * cover shows.
 */
function useDeferredCardBook3D() {
  const ref = useRef<HTMLDivElement>(null)
  const [Loaded, setLoaded] = useState<Loaded | null>(null)
  const [openOnLoad, setOpenOnLoad] = useState(false)
  const [navigateToPage, setNavigateToPage] = useState<number>()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let started = false
    let loaded = false
    let idleId: number | undefined
    const load = () => {
      if (started) return
      started = true
      void import("@/components/card-book-3d").then((m) => {
        loaded = true
        setLoaded(() => m.CardBook3D)
      })
    }
    // A click before the 3D card is ready (even if hovering already started loading it)
    // opens it once it takes over; after that, the card handles clicks itself.
    const loadAndOpen = () => {
      if (loaded) return
      setOpenOnLoad(true)
      load()
    }

    const hasMouse = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
    let observer: IntersectionObserver | undefined
    if (hasMouse) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return
          observer?.disconnect()
          if ("requestIdleCallback" in window) {
            idleId = window.requestIdleCallback(load, { timeout: 3000 })
          } else {
            idleId = setTimeout(load, 1500) as unknown as number
          }
        },
        { rootMargin: "200px" },
      )
      observer.observe(el)
      el.addEventListener("pointerenter", load)
    }
    el.addEventListener("click", loadAndOpen)
    el.addEventListener("focusin", load)

    return () => {
      observer?.disconnect()
      if (idleId !== undefined) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId)
        else clearTimeout(idleId)
      }
      el.removeEventListener("pointerenter", load)
      el.removeEventListener("click", loadAndOpen)
      el.removeEventListener("focusin", load)
    }
  }, [])

  // A tap loaded the card: let it take over closed, then turn to the first page.
  useEffect(() => {
    if (!Loaded || !openOnLoad) return
    const timer = window.setTimeout(
      () => setNavigateToPage(1),
      OPEN_AFTER_LOAD_MS,
    )
    return () => window.clearTimeout(timer)
  }, [Loaded, openOnLoad])

  return { ref, Loaded, navigateToPage }
}

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
  closedZoom,
  fitOpenSpread,
  idleSway,
  cornerRadius,
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
  closedZoom?: number
  fitOpenSpread?: boolean
  idleSway?: boolean
  cornerRadius?: number
  className?: string
}) {
  const { ref, Loaded, navigateToPage } = useDeferredCardBook3D()
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

  const cardProps: CardBook3DProps = {
    imageUrl,
    headline,
    message,
    recipientName,
    contributions,
    showPager,
    frameClassName,
    closedZoom,
    fitOpenSpread,
    idleSway,
    cornerRadius,
  }

  return (
    <MessageFontVariables className={className ?? "w-full"}>
      <div ref={ref}>
        {Loaded ? (
          <Loaded {...cardProps} navigateToPage={navigateToPage} />
        ) : (
          <CardBook3DPlaceholder {...cardProps} />
        )}
      </div>
    </MessageFontVariables>
  )
}
