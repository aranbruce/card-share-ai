"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { CreateStepIndicator } from "@/components/create-step-indicator"
import { StatsLine } from "@/components/social-proof"
import {
  CARD_OCCASIONS,
  coverPlaceholderGradient,
  type CardOccasion,
} from "@/lib/card-occasions"
import type { StatItem } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

/** Step 1 of creating a card: pick the occasion in the studio's left panel. */
export function OccasionStep({
  selected,
  onSelect,
  onContinue,
  backHref,
  backLabel,
  stats = [],
}: {
  selected: string
  onSelect: (id: string) => void
  onContinue: () => void
  backHref: string
  backLabel: string
  /** Site-wide usage stats shown under Continue; hidden when empty. */
  stats?: StatItem[]
}) {
  return (
    <aside className="flex min-h-svh flex-col border-r border-line bg-card px-7 py-4 md:sticky md:top-0 md:h-svh md:min-h-0 md:overflow-y-auto">
      <Logo className="self-start" />
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mt-6 -ml-4 self-start text-muted-foreground"
      >
        <Link href={backHref}>
          <ArrowLeft />
          {backLabel}
        </Link>
      </Button>

      <CreateStepIndicator step={1} total={3} className="mt-5" />
      <h2 className="mt-3.5 text-[38px] leading-[1.05] font-semibold tracking-[-0.03em]">
        What kind <br />
        <span className="text-muted-foreground">of card?</span>
      </h2>
      <p className="mt-2.5 text-sm leading-normal text-muted-foreground">
        Pick an occasion to set the tone. Everything is editable. This just
        gives the AI a starting point
      </p>

      <div
        role="radiogroup"
        aria-label="Occasion"
        className="mt-6 mb-4 flex flex-col gap-1.5 md:mb-8"
      >
        {CARD_OCCASIONS.map((o) => (
          <OccasionRow
            key={o.id}
            occasion={o}
            selected={o.id === selected}
            onSelect={() => onSelect(o.id)}
            onConfirm={onContinue}
          />
        ))}
      </div>

      <Button type="button" className="mt-auto w-full" onClick={onContinue}>
        Continue
        <ArrowRight />
      </Button>
      <StatsLine items={stats} className="mt-3 justify-center text-xs" />
    </aside>
  )
}

function OccasionRow({
  occasion,
  selected,
  onSelect,
  onConfirm,
}: {
  occasion: CardOccasion
  selected: boolean
  onSelect: () => void
  onConfirm: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onDoubleClick={onConfirm}
      className={cn(
        "grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_18px] items-center gap-3.5 rounded-xl border px-3 py-[9px] text-left transition-colors",
        selected
          ? "border-foreground bg-background"
          : "border-border bg-card hover:border-foreground/25",
      )}
    >
      <OccasionCover occasion={occasion} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {occasion.label}
        </span>
        <span className="truncate text-[12.5px] leading-[1.4] text-muted-foreground">
          {occasion.desc}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "size-[18px] rounded-full bg-card",
          selected
            ? "border-[5px] border-foreground"
            : "border-[1.5px] border-border",
        )}
      />
    </button>
  )
}

/** An occasion's example cover as a small card; Custom gets the studio's placeholder gradient. */
function OccasionCover({ occasion }: { occasion: CardOccasion }) {
  if (!occasion.cover) {
    return (
      <div
        style={{ background: coverPlaceholderGradient(occasion.hue) }}
        className="flex aspect-4/5 items-center justify-center rounded-[2px_5px_5px_2px] shadow-[0_6px_10px_-6px_rgba(40,24,10,0.3)]"
      >
        <Plus className="size-3.5 text-white" strokeWidth={2.5} />
      </div>
    )
  }
  return (
    <div className="relative aspect-4/5 overflow-hidden rounded-[2px_5px_5px_2px] shadow-[0_6px_10px_-6px_rgba(40,24,10,0.45)]">
      <Image
        src={occasion.cover}
        alt=""
        fill
        sizes="36px"
        className="object-cover"
      />
    </div>
  )
}
