import Image from "next/image"
import { cn } from "@/lib/utils"
import type { StatItem } from "@/lib/social-proof"
import type { CustomerLogo, Testimonial } from "@/lib/testimonials"

/** One-line usage stats, e.g. "1,200+ cards created · 8,000+ notes signed". */
export function StatsLine({
  items,
  className,
}: {
  items: StatItem[]
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {item.value}
            </span>{" "}
            {item.label}
          </span>
        </span>
      ))}
    </p>
  )
}

export function LogoStrip({
  logos,
  className,
}: {
  logos: CustomerLogo[]
  className?: string
}) {
  if (logos.length === 0) return null
  return (
    <div className={cn("text-center", className)}>
      <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
        Used by teams at
      </p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {logos.map((logo) => (
          <li key={logo.name}>
            <Image
              src={logo.src}
              alt={logo.name}
              width={logo.width}
              height={logo.height}
              className="h-7 w-auto opacity-70 grayscale dark:invert"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TestimonialsSection({
  testimonials,
  eyebrow = "In their words",
  title = "What people say",
}: {
  testimonials: Testimonial[]
  eyebrow?: string
  title?: string
}) {
  if (testimonials.length === 0) return null
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
        <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
          {title}
        </h2>
        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <li key={`${t.name}-${t.quote.slice(0, 24)}`}>
              <figure className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-secondary/50 p-6">
                <blockquote className="text-base leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="text-sm">
                  <span className="font-semibold">{t.name}</span>
                  {t.role && (
                    <span className="block text-muted-foreground">
                      {t.role}
                    </span>
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
