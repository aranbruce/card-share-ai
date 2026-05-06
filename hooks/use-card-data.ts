"use client"

import { useEffect, useRef, useState } from "react"
import type { Contribution } from "@/lib/card-body"
import type { OwnerCard } from "@/components/card-owner-studio"
import { ApiError, apiFetch } from "@/lib/api-client"

export function useCardData(cardId: string, reloadNonce?: number) {
  const [card, setCard] = useState<OwnerCard | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError("")
      try {
        const { card: c, contributions: list } = await apiFetch<{
          card: OwnerCard
          contributions?: Contribution[]
        }>(`/api/cards/${encodeURIComponent(cardId)}`, { cache: "no-store" })
        if (cancelled) return
        setCard(c)
        setContributions(list ?? [])
      } catch (e) {
        if (cancelled) return
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
      try {
        const { card: c, contributions: list } = await apiFetch<{
          card: OwnerCard
          contributions?: Contribution[]
        }>(`/api/cards/${encodeURIComponent(cardId)}`, { cache: "no-store" })
        if (cancelled) return
        setCard(c)
        setContributions(list ?? [])
      } catch (e) {
        if (cancelled) return
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

  return { card, setCard, contributions, setContributions, loading, error }
}
