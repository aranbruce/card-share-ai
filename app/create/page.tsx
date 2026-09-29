import type { Metadata } from "next"
import { getSiteStats } from "@/lib/site-stats"
import { buildPageMetadata } from "@/lib/site-metadata"
import { buildStatItems } from "@/lib/social-proof"
import { CreateCardPageClient } from "./create-card-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Create a card",
  description:
    "Start a free AI greeting card. Describe the occasion, pick a tone, and share one link for everyone to sign.",
  path: "/create",
})

// Regenerates hourly so the usage stats stay current.
export const revalidate = 3600

export default async function CreatePage() {
  const stats = buildStatItems(await getSiteStats())
  return <CreateCardPageClient stats={stats} />
}
