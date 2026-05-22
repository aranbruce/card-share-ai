"use client"

import { useEffect, useState } from "react"
import type { Contribution } from "@/lib/card-body"
import type { OwnerCard } from "@/components/card-owner-studio"
import { ApiError, apiFetch } from "@/lib/api-client"
import {
  type ApiContribution,
  normalizeContributionFromApi,
} from "@/lib/contribution-layout"

function contributionsFromApi(
  list: ApiContribution[] | undefined,
): Contribution[] {
  return (list ?? []).map(normalizeContributionFromApi)
}

export function useCardData(cardId: string, reloadNonce?: number) {
  const [card, setCard] = useState<OwnerCard | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [displayExtraPages, setDisplayExtraPages] = useState(0)
  const [contributionsLoaded, setContributionsLoaded] = useState(true)
  const [unusedExtraPagesDetected, setUnusedExtraPagesDetected] =
    useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError("")
      setCard(null)
      setContributions([])
      setDisplayExtraPages(0)
      setContributionsLoaded(false)
      setUnusedExtraPagesDetected(false)
      try {
        const {
          card: c,
          contributions: list,
          contributionsLoaded,
          displayExtraPages: display,
          unusedExtraPagesDetected: unused,
        } = await apiFetch<{
          card: OwnerCard
          contributions?: ApiContribution[]
          contributionsLoaded?: boolean
          displayExtraPages?: number
          unusedExtraPagesDetected?: boolean
        }>(`/api/cards/${encodeURIComponent(cardId)}`, { cache: "no-store" })
        if (cancelled) return
        setCard(c)
        setContributions(contributionsFromApi(list))
        setContributionsLoaded(contributionsLoaded !== false)
        setDisplayExtraPages(
          typeof display === "number" && Number.isFinite(display)
            ? Math.max(0, Math.trunc(display))
            : (c.extra_pages ?? 0),
        )
        setUnusedExtraPagesDetected(unused === true)
      } catch (e) {
        if (cancelled) return
        setContributions([])
        setContributionsLoaded(false)
        setDisplayExtraPages(0)
        setUnusedExtraPagesDetected(false)
        const message =
          e instanceof ApiError && e.status === 401
            ? "You need to be signed in to open this card."
            : e instanceof Error
              ? e.message
              : "Failed to load"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cardId, reloadNonce])

  return {
    card,
    setCard,
    contributions,
    setContributions,
    displayExtraPages,
    setDisplayExtraPages,
    contributionsLoaded,
    unusedExtraPagesDetected,
    loading,
    error,
  }
}
