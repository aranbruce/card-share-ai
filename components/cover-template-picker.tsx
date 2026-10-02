"use client"

import Image from "next/image"
import { Check, Sparkles } from "lucide-react"
import { ScrollArrow, scrollByPage } from "@/components/ui/edge-fade-scroller"
import { useScrollEdgeFade } from "@/hooks/use-scroll-edge-fade"
import { cn } from "@/lib/utils"
import type { CardTemplate } from "@/lib/card-templates"

/** Width of the carousel's edge fade. */
const EDGE_FADE = "3rem"

/** Middle of a tile's image: the scroller's top padding plus half a 112px-wide 4:5 image. */
const ARROW_TOP = "top-[calc(0.25rem+70px)]"

interface CoverTemplatePickerProps {
  templates: CardTemplate[]
  selectedId: string | null
  /** null means no template. */
  onSelect: (id: string | null) => void
  disabled?: boolean
}

export function CoverTemplatePicker({
  templates,
  selectedId,
  onSelect,
  disabled,
}: CoverTemplatePickerProps) {
  const {
    ref: scrollerRef,
    onScroll,
    canScroll,
    maskStyle,
  } = useScrollEdgeFade<HTMLDivElement>(EDGE_FADE, [templates])

  const select = (id: string | null, tile: HTMLElement) => {
    onSelect(id)
    tile.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    })
  }

  return (
    <div className="relative -mx-7">
      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label="Template"
        onScroll={onScroll}
        style={maskStyle}
        className="flex snap-x snap-mandatory scroll-px-7 scrollbar-none gap-2.5 overflow-x-auto overscroll-x-contain px-7 pt-1 pb-2 [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selectedId === null}
          onClick={(e) => select(null, e.currentTarget)}
          disabled={disabled}
          className="group w-28 shrink-0 cursor-pointer snap-start text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div
            className={cn(
              "relative flex aspect-4/5 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-linear-to-br from-brand/15 via-brand/5 to-muted px-3 text-center ring-2 ring-offset-2 ring-offset-card transition",
              selectedId === null
                ? "ring-foreground"
                : "ring-transparent group-hover:ring-border",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-card text-brand shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              We&rsquo;ll design the cover from your details
            </span>
            {selectedId === null && (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3" />
              </span>
            )}
          </div>
          <span
            className={cn(
              "mt-1.5 line-clamp-2 text-[11px] leading-tight",
              selectedId === null ? "text-foreground" : "text-muted-foreground",
            )}
          >
            No template
          </span>
        </button>
        {templates.map((t) => {
          const selected = t.id === selectedId
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={(e) => select(t.id, e.currentTarget)}
              disabled={disabled}
              className="group w-28 shrink-0 cursor-pointer snap-start text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div
                className={cn(
                  "relative aspect-4/5 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-card transition",
                  selected
                    ? "ring-foreground"
                    : "ring-transparent group-hover:ring-border",
                )}
              >
                <Image
                  src={t.thumbnail}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
                {selected && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 line-clamp-2 text-[11px] leading-tight",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t.name}
              </span>
            </button>
          )
        })}
      </div>

      {canScroll.back && (
        <ScrollArrow
          direction="back"
          label="Previous scenes"
          onClick={() => scrollByPage(scrollerRef.current, -1)}
          className={ARROW_TOP}
        />
      )}
      {canScroll.forward && (
        <ScrollArrow
          direction="forward"
          label="More scenes"
          onClick={() => scrollByPage(scrollerRef.current, 1)}
          className={ARROW_TOP}
        />
      )}
    </div>
  )
}
