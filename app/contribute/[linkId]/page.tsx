import Link from "next/link"
import { notFound } from "next/navigation"
import { ContributeCardPageClient } from "@/app/contribute/[linkId]/contribute-card-client"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { getContributeCardByLinkId } from "@/lib/contribute-card"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import { FileX2 } from "lucide-react"

type PageProps = {
  params: Promise<{ linkId: string }>
}

export default async function ContributeCardPage({ params }: PageProps) {
  const { linkId } = await params

  let initialData
  try {
    initialData = await getContributeCardByLinkId(linkId)
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <FileX2 className="size-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Could not load card
            </h1>
            <p className="max-w-xs text-sm text-muted-foreground">
              Something went wrong. Please try again in a moment.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </main>
      </div>
    )
  }

  if (!initialData) {
    notFound()
  }

  const initialComposeTextColor = randomPresetTextColor()

  return (
    <ContributeCardPageClient
      linkId={linkId}
      initialData={initialData}
      initialComposeTextColor={initialComposeTextColor}
    />
  )
}
