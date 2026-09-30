import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicCardView } from "@/components/public-card-view"
import { Button } from "@/components/ui/button"
import { getPublicCardByLinkId } from "@/lib/public-card-view"
import { buildViewCardMetadata } from "@/lib/view-card-metadata"
import { FileX2 } from "lucide-react"

type PageProps = {
  params: Promise<{ linkId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { linkId } = await params
  return buildViewCardMetadata(linkId)
}

export default async function PublicCardPage({ params }: PageProps) {
  const { linkId } = await params

  let result
  try {
    result = await getPublicCardByLinkId(linkId)
  } catch {
    return <PublicCardLoadError />
  }

  if (!result) {
    notFound()
  }

  return (
    <PublicCardView
      linkId={linkId}
      card={result.card}
      contributions={result.contributions}
    />
  )
}

function PublicCardLoadError() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <FileX2 className="size-8 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Could not load card
          </h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            Something went wrong. Please try again in a moment.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </main>
  )
}
