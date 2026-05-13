"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const PLATFORM_LABELS: Record<string, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
  whatsapp: "WhatsApp",
}

function LinkChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  )
  const [platform, setPlatform] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>(
    token ? "" : "Invalid link — no token provided.",
  )

  useEffect(() => {
    if (!token) return

    async function exchange() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const next = encodeURIComponent(`/auth/link-chat?token=${token}`)
        router.replace(`/auth/login?next=${next}`)
        return
      }

      const res = await fetch("/api/bot/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error ?? "Something went wrong.")
        return
      }

      setPlatform(data.platform ?? "")
      setStatus("success")
    }

    exchange()
  }, [token, router])

  if (status === "loading") {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Connecting your account…</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Link failed</h1>
        <p className="text-muted-foreground">{errorMessage}</p>
        <p className="text-sm text-muted-foreground">
          Try requesting a new link from the bot.
        </p>
      </div>
    )
  }

  const platformLabel = PLATFORM_LABELS[platform] ?? platform

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Account connected!
      </h1>
      <p className="text-muted-foreground">
        Your{platformLabel ? ` ${platformLabel}` : ""} account is now linked to
        CardsAI. You can create cards directly from the bot.
      </p>
      <p className="text-sm text-muted-foreground">
        Head back to the chat and use{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">/cardsai</code>{" "}
        to create your first card.
      </p>
    </div>
  )
}

export default function LinkChatPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <LinkChatContent />
    </Suspense>
  )
}
