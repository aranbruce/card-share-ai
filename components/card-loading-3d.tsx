import { Sparkles } from "lucide-react"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * Loading and placeholder state in the style of the 3D card: a card of card stock standing at an
 * angle, floating gently. While generating, its cover shimmers and eases open now and then; the
 * placeholder variant is a still card with a prompt on the cover, and the preview variant shows
 * an example cover (the occasion's or a template's) with nothing over it.
 *
 * CSS 3D rather than Three.js so it costs nothing to show and never competes with the real card
 * for a WebGL context.
 */
export function CardLoading3D({
  variant = "generating",
  hue = 40,
  imageUrl,
  label,
  className,
}: {
  variant?: "generating" | "placeholder" | "preview"
  /** Cover gradient hue (card type colour). */
  hue?: number
  /** Existing cover to show under the shimmer (e.g. while regenerating). */
  imageUrl?: string | null
  /** Text on the cover. */
  label?: string
  className?: string
}) {
  const generating = variant === "generating"
  const preview = variant === "preview"
  const cover: CSSProperties = {
    background: `linear-gradient(135deg, oklch(0.9 0.08 ${hue}) 0%, oklch(0.76 0.13 ${hue - 15}) 100%)`,
  }
  const text =
    label ??
    (generating
      ? "Designing your card…"
      : "Fill in the details and hit Generate to see your card")

  return (
    <div
      className={cn(
        "relative flex aspect-4/5 w-full max-w-md items-center justify-center perspective-[1300px]",
        className,
      )}
      role={generating ? "status" : undefined}
      aria-live={generating ? "polite" : undefined}
    >
      <div
        aria-hidden
        className="card-3d-float-shadow absolute bottom-[4%] h-[5%] w-[62%] rounded-[50%] bg-black/30 blur-lg"
      />
      <div
        className="card-3d-float relative aspect-4/5 h-[84%] transform-3d"
        style={{ transform: "rotateX(7deg) rotateY(-18deg)" }}
      >
        {/* Inside page */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[4px] bg-linear-to-br from-amber-50 to-orange-50 shadow-lg"
          style={{ transform: "translateZ(-6px)" }}
        >
          <div className="absolute inset-x-[14%] top-[22%] space-y-[8%]">
            <div className="h-1 w-4/5 rounded-full bg-stone-300/60" />
            <div className="h-1 w-full rounded-full bg-stone-300/60" />
            <div className="h-1 w-3/5 rounded-full bg-stone-300/60" />
          </div>
        </div>
        {/* Card stock between the leaves */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[4px] bg-[#efe6d4]"
          style={{ transform: "translateZ(-3px)" }}
        />
        {/* Cover, hinged on the spine */}
        <div
          className={cn(
            "absolute inset-0 origin-left overflow-hidden rounded-[4px] shadow-xl backface-hidden",
            generating && "card-3d-peek",
          )}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- decorative, may be a data URL
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "absolute inset-0 size-full object-cover",
                !preview && "opacity-70",
              )}
            />
          ) : (
            <div className="absolute inset-0" style={cover} />
          )}
          {!preview && (
            <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
          )}
          {generating ? (
            <div className="ai-refine-shimmer-sweep-cover absolute inset-0" />
          ) : null}
          {/* Gloss */}
          <div className="absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-transparent" />
          {/* Crease along the spine */}
          <div className="absolute inset-y-0 left-0 w-[6%] bg-linear-to-r from-black/15 to-transparent" />
          {preview ? (
            !imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/90 text-brand shadow-sm">
                  <Sparkles className="size-6" />
                </div>
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl shadow-sm",
                  generating && "animate-pulse",
                )}
                style={{ background: `oklch(0.68 0.14 ${hue})` }}
              >
                <Sparkles className="size-5 stroke-white" />
              </div>
              <p
                className="text-sm leading-relaxed font-medium"
                style={{
                  color: imageUrl ? "white" : `oklch(0.28 0.07 ${hue})`,
                }}
              >
                {text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
