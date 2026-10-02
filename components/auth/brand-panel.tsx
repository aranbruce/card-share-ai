import Image from "next/image"
import { CardThumb3D } from "@/components/dashboard/card-thumb-3d"
import { Logo } from "@/components/logo"
import { MessageFontVariables } from "@/components/message-font-variables"
import { CATEGORY_CONFIGS, type CategoryConfig } from "@/lib/category-pages"
import { getMessageFontFamily } from "@/lib/message-font-presets"

/** Upbeat occasions to rotate through (no sympathy or get-well cards on a sign-in page). */
const STAGE_OCCASIONS = [
  "birthday",
  "thank-you",
  "farewell",
  "work-anniversary",
  "promotion",
  "kudos",
  "retirement",
  "new-baby",
  "wedding",
  "graduation",
].map((slug) => CATEGORY_CONFIGS[slug])

/** Where the fanned cards sit on the stage, as percentages of it: back to front. */
const CARD_SLOTS = [
  { className: "top-[6%] -left-[4%]", rotate: -7 },
  { className: "top-[12%] -right-[6%]", rotate: 6 },
  { className: "top-[38%] left-[21%]", rotate: -1 },
]

/**
 * Signers' faces for the chips: free-license Unsplash portraits, face-cropped to 96px. In
 * order, unsplash.com/photos/ mEZ3PoFGs_k, iFgRcqHznqg, IF9TK5Uy-KI, AR9mvykzSOA,
 * COOrCB6qqO0, UpiF461EAHU, MQ2xYBHImKM, v7Jja2ChN6s, B41fY4dhX18, N8lRH2uxih4,
 * y3kC_7Qhmjk and 0pOlBhSsF80.
 */
const AVATARS = Array.from(
  { length: 12 },
  (_, i) => `/avatars/person-${i + 1}.webp`,
)

/** Faces in the "people signed" stack; the note's signer is a different face again. */
const STACK_SIZE = 4

/**
 * A random occasion for the front card, with the next two in the list behind it (back to
 * front), and five different signers' faces: the note's signer first, then the stack.
 */
function pickStage(): { cards: CategoryConfig[]; avatars: string[] } {
  const front = Math.floor(Math.random() * STAGE_OCCASIONS.length)
  return {
    cards: [1, 2, 0].map(
      (offset) => STAGE_OCCASIONS[(front + offset) % STAGE_OCCASIONS.length],
    ),
    avatars: AVATARS.map((src) => ({ src, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, STACK_SIZE + 1)
      .map(({ src }) => src),
  }
}

function Avatar({ src, className }: { src: string; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={24}
      height={24}
      className={`size-6 shrink-0 rounded-full object-cover ${className ?? ""}`}
    />
  )
}

/** Matches Tailwind's `lg`, where the panel appears. */
const PANEL_MEDIA = "(min-width: 64rem)"

const CHIP_CLASSES =
  "absolute z-20 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)]"

/**
 * The left half of the auth pages: a gradient stage with a fan of sample cards and signature
 * chips, like the occasion page heroes. The front occasion changes on each visit.
 */
export function AuthBrandPanel() {
  const { cards, avatars } = pickStage()
  const front = cards[cards.length - 1]
  const note = front.sampleNotes[0]

  return (
    <div className="hidden flex-col gap-10 border-r border-line bg-background p-12 lg:flex xl:p-14">
      <Logo className="self-start" />

      {/* Size container, so the stage keeps its shape (and the cards fit) at any panel
          height, down to short laptop screens. */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        style={{ containerType: "size" }}
      >
        <div
          aria-hidden
          className="relative aspect-4/5 w-[min(100cqw,80cqh)] max-w-120"
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl shadow-[0_40px_80px_-48px_rgba(20,14,6,0.35)] ring-1 ring-white/40 ring-inset"
            style={{ background: front.frontGradient }}
          >
            {/* Soft light from the top left, a little shade bottom right, and a faint dot
                grid, for depth. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 70% at 15% 0%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(20,14,6,0.12), transparent 70%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.5px)",
                backgroundSize: "18px 18px",
                maskImage:
                  "radial-gradient(70% 70% at 50% 45%, transparent 35%, black 100%)",
              }}
            />
            {cards.map((config, i) => (
              // Each card opens, and comes to the front, on its own hover. The wrapper boxes
              // overlap, so only the card itself catches the pointer.
              <div
                key={config.slug}
                className={`group pointer-events-none absolute aspect-square w-[58%] hover:z-10 [&_.transform-3d]:pointer-events-auto ${CARD_SLOTS[i].className}`}
              >
                <CardThumb3D
                  imageUrl={config.coverImage}
                  headline={config.cardTitle}
                  alt=""
                  hue={config.coverHue}
                  eagerMedia={PANEL_MEDIA}
                  cardHeight={88}
                  cardOffsetY={0}
                  rotate={CARD_SLOTS[i].rotate}
                />
              </div>
            ))}
          </div>

          {/* Signature chips, overlapping the stage's edges */}
          <div className={`${CHIP_CLASSES} -top-4 -right-4 text-xs`}>
            <div className="flex -space-x-1.5">
              {avatars.slice(1).map((src) => (
                <Avatar key={src} src={src} className="ring-2 ring-card" />
              ))}
            </div>
            <div>
              <div className="font-medium">
                {front.sampleNotes.length + 9} people signed
              </div>
              <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
                3 in the last hour
              </div>
            </div>
          </div>
          <MessageFontVariables
            className={`${CHIP_CLASSES} bottom-[8%] -left-5 max-w-64`}
          >
            <Avatar src={avatars[0]} />
            <div
              className="text-lg leading-tight"
              style={{
                color: note.color,
                fontFamily: getMessageFontFamily(note.font),
              }}
            >
              {note.message}
            </div>
          </MessageFontVariables>
        </div>
      </div>
    </div>
  )
}
