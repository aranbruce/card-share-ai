import type { Metadata } from "next"
import { getCardOccasion } from "@/lib/card-occasions"
import {
  CARD_TEMPLATES,
  defaultOccasionForTemplate,
  templatesForOccasion,
} from "@/lib/card-templates"
import { sitePreviewImagePath } from "@/lib/site-preview-pages"
import { getSiteStats } from "@/lib/site-stats"
import { buildPageMetadata } from "@/lib/site-metadata"
import { buildStatItems } from "@/lib/social-proof"
import { CreateCardPageClient } from "./create-card-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Create a card",
  description:
    "Start a free AI greeting card. Describe the occasion, pick a tone, and share one link for everyone to sign.",
  path: "/create",
  imageUrl: sitePreviewImagePath("create"),
})

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    occasion?: string | string[]
    template?: string | string[]
  }>
}) {
  // Links from the photo templates section open the cover step with an occasion, and
  // optionally a template, already picked.
  const params = await searchParams
  const template = CARD_TEMPLATES.find((t) => t.id === params.template)
  const linkedOccasion =
    typeof params.occasion === "string"
      ? getCardOccasion(params.occasion)?.id
      : undefined
  const offered =
    !!template &&
    !!linkedOccasion &&
    templatesForOccasion(linkedOccasion).includes(template)
  const occasion =
    template && !offered ? defaultOccasionForTemplate(template) : linkedOccasion
  const stats = buildStatItems(await getSiteStats())
  return (
    <CreateCardPageClient
      initialOccasion={occasion}
      initialTemplateId={template?.id}
      stats={stats}
    />
  )
}
