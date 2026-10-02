import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { TemplateGallery } from "@/components/template-gallery"
import { CARD_TEMPLATES, type CardTemplate } from "@/lib/card-templates"

/** A strip of funny photo templates for marketing pages, linking to the full gallery. */
export function TemplateShowcase({
  templates,
  title = "Put them in the picture",
  description = "Upload a photo of a friend, family member or colleague and pick a scene. AI redraws them into it as the star of the cover",
}: {
  templates: CardTemplate[]
  title?: string
  description?: string
}) {
  if (templates.length === 0) return null
  return (
    <section id="templates" className="border-t border-border">
      <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              Funny photo templates
            </p>
            <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            See all {CARD_TEMPLATES.length} scenes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <TemplateGallery templates={templates.slice(0, 6)} className="mt-10" />
      </div>
    </section>
  )
}
