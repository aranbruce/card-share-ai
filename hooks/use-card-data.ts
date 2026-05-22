"use client"

import { useEffect, useRef, useState } from "react"
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
  const [contributionsLoaded, setContributionsLoaded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError("")
      setCard(null)
      setContributions([])
      setContributionsLoaded(false)
      try {
        const { card: c, contributions: list, contributionsLoaded } =
          await apiFetch<{
            card: OwnerCard
            contributions?: ApiContribution[]
            contributionsLoaded?: boolean
          }>(`/api/cards/${encodeURIComponent(cardId)}`, { cache: "no-store" })
        if (cancelled) return
        setCard(c)
        setContributions(contributionsFromApi(list))
        setContributionsLoaded(contributionsLoaded !== false)
      } catch (e) {
        if (cancelled) return
        setCard(null)
        setContributions([])
        setContributionsLoaded(false)
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
  }, [cardId])

  const prevReloadNonceRef = useRef(reloadNonce ?? 0)
  useEffect(() => {
    const nonce = reloadNonce ?? 0
    if (nonce === prevReloadNonceRef.current) return

    prevReloadNonceRef.current = nonce

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError("")
      setCard(null)
      setContributions([])
      setContributionsLoaded(false)
      try {
        const { card: c, contributions: list, contributionsLoaded } =
          await apiFetch<{
            card: OwnerCard
            contributions?: ApiContribution[]
            contributionsLoaded?: boolean
          }>(`/api/cards/${encodeURIComponent(cardId)}`, { cache: "no-store" })
        if (cancelled) return
        setCard(c)
        setContributions(contributionsFromApi(list))
        setContributionsLoaded(contributionsLoaded !== false)
      } catch (e) {
        if (cancelled) return
        setCard(null)
        setContributions([])
        setContributionsLoaded(false)
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
  }, [reloadNonce, cardId])

  return {
    card,
    setCard,
    contributions,
    setContributions,
    contributionsLoaded,
    loading,
    error,
  }
}
