import Link from "next/link"
import { CardThumb3D } from "@/components/dashboard/card-thumb-3d"

export type CardTile = {
  key: string
  href: string
  /** CSS background of the tile behind the card. */
  background: string
  coverImage: string
  /** Hue of the card's plain cover if its image fails. */
  coverHue: number
  headline: string
  title: string
  desc: string
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

/**
 * A side-scrolling row of gradient tiles, each holding a standing mockup card that swings
 * open on hover, with a title and a line of description underneath.
 */
export function CardTileRow({ tiles }: { tiles: readonly CardTile[] }) {
  return (
    <div className="relative mt-10 w-full overflow-scroll">
      <div className="flex touch-pan-x snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] md:scroll-px-15">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className="group w-[180px] shrink-0 snap-start snap-always sm:w-[200px] md:w-[220px]"
          >
            <div
              className="card-preview-aspect relative overflow-hidden rounded-2xl transition-all duration-200 group-hover:translate-y-[-3px] group-hover:shadow-[0_26px_48px_-28px_rgba(20,14,6,0.32)]"
              style={{ background: tile.background }}
            >
              <CardThumb3D
                imageUrl={tile.coverImage}
                headline={tile.headline}
                alt=""
                hue={tile.coverHue}
                cardHeight={80}
                cardOffsetY={-2}
              />
              <div className="absolute right-3 bottom-3 flex size-7 translate-y-[6px] items-center justify-center rounded-full bg-white/90 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowIcon />
              </div>
            </div>
            <div className="mt-2.5 text-sm font-medium tracking-[-0.01em]">
              {tile.title}
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {tile.desc}
            </div>
          </Link>
        ))}
        <div aria-hidden className="w-6 shrink-0 md:w-15" />
      </div>
    </div>
  )
}
