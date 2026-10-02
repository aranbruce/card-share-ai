import type { Metadata } from "next"
import { CARD_TEMPLATES } from "@/lib/card-templates"
import { buildPageMetadata } from "@/lib/site-metadata"
import { CreateCardPageClient } from "./create-card-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Create a card",
  description:
    "Start a free AI greeting card. Describe the occasion, pick a tone, and share one link for everyone to sign.",
  path: "/create",
})

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>
}) {
  // `?template=<id>` (from the template gallery) opens the flow with that scene picked.
  const { template } = await searchParams
  const initialTemplate = CARD_TEMPLATES.find((t) => t.id === template)
  return <CreateCardPageClient initialTemplateId={initialTemplate?.id} />
}
