import Image from "next/image"
import { MousePointerClick } from "lucide-react"
import { SampleCard3D } from "@/components/sample-card-3d"
import type { CategoryConfig } from "@/lib/category-pages"
import { sampleAvatarsFor } from "@/lib/sample-avatars"

function Avatar({ src, className }: { src: string; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={20}
      height={20}
      className={`size-5 shrink-0 rounded-full object-cover ${className ?? ""}`}
    />
  )
}

/**
 * An occasion's sample card as the interactive 3D card on its gradient stage, with a hint to
 * open it and a couple of signature chips around the edges. Used in occasion and comparison
 * page heroes.
 */
export function OccasionCardStage({ config }: { config: CategoryConfig }) {
  // The note's signer first, then a different face for each in the "signed" stack
  const [noteAvatar, ...stackAvatars] = sampleAvatarsFor(
    config.slug,
    config.sampleNotes.length + 1,
  )

  return (
    <div className="relative mx-auto mt-12 w-full max-w-120 lg:mt-0">
      <div
        className="relative rounded-3xl px-2 pt-12 pb-4 shadow-[0_40px_80px_-48px_rgba(20,14,6,0.35)] ring-1 ring-white/40 ring-inset sm:px-4"
        style={{ background: config.frontGradient }}
      >
        {/* Soft light from the top left, a little shade bottom right, and a faint dot
            grid, for depth. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "radial-gradient(90% 70% at 15% 0%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(20,14,6,0.12), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.5px)",
            backgroundSize: "18px 18px",
            maskImage:
              "radial-gradient(70% 70% at 50% 45%, transparent 35%, black 100%)",
          }}
        />
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-sm sm:top-5 sm:left-6">
          <MousePointerClick className="size-3.5" aria-hidden />
          Open the card to read the notes
        </div>
        <SampleCard3D
          id={config.slug}
          imageUrl={config.coverImage ?? ""}
          headline={config.cardTitle}
          recipientName={config.sampleRecipient}
          message={config.sampleMessage}
          notes={config.sampleNotes}
          showPager={false}
          frameClassName="aspect-square"
          closedZoom={1.12}
          fitOpenSpread={false}
          className="relative w-full"
        />
      </div>

      {/* Signature chips, overlapping the stage's edges. */}
      <div
        aria-hidden
        className="absolute -top-4 -right-3 z-20 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)] sm:flex lg:-right-6"
      >
        <div className="flex -space-x-1.5">
          {stackAvatars.map((src) => (
            <Avatar key={src} src={src} className="ring-2 ring-card" />
          ))}
        </div>
        <div>
          <div className="font-medium">
            {config.sampleNotes.length + 9} people signed
          </div>
          <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            3 in the last hour
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute -bottom-5 -left-3 z-20 hidden max-w-55 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)] sm:flex lg:-left-8"
      >
        <Avatar src={noteAvatar} />
        <div className="text-sm leading-tight">
          {config.sampleNotes[0].message}
        </div>
      </div>
    </div>
  )
}
