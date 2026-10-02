import Image from "next/image"
import Link from "next/link"
import type { CardTemplate } from "@/lib/card-templates"
import { cn } from "@/lib/utils"

/** Opens the create flow with the template already picked. */
export function templateCreateHref(template: CardTemplate): string {
  return `/create?template=${template.id}`
}

/**
 * A grid of funny photo template thumbnails, each starting a card with that scene. The grey
 * oval in each thumbnail is where the person's photo goes.
 */
export function TemplateGallery({
  templates,
  className,
}: {
  templates: CardTemplate[]
  className?: string
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {templates.map((t) => (
        <li key={t.id}>
          <Link href={templateCreateHref(t)} className="group block">
            <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-muted ring-1 ring-border transition group-hover:ring-2 group-hover:ring-foreground/40">
              <Image
                src={t.thumbnail}
                alt={`${t.name} template, with a blank oval where your photo goes`}
                fill
                sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-2 text-sm font-medium tracking-[-0.015em]">
              {t.name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
