"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { Inbox, Trash2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { apiFetch, apiDelete } from "@/lib/api-client"
import { looksLikeDataUrl } from "@/lib/source-image-limits"

interface CardItem {
  id: string
  recipient_name: string
  sender_name: string
  card_type: string
  image_url: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  birthday: "Birthday",
  thank_you: "Thank you",
  congratulations: "Congrats",
  holiday: "Holiday",
  sympathy: "Sympathy",
  custom: "Custom",
}

const TYPE_HUE: Record<string, number> = {
  birthday: 18,
  thank_you: 40,
  congratulations: 70,
  holiday: 150,
  sympathy: 310,
  custom: 230,
}

function initials(user: User): string {
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ""
  const parts = name.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function displayName(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "You"
  )
}

// ── Sidebar nav icon ──────────────────────────────────────────────────────────
function NavIcon({ name }: { name: string }) {
  if (name === "cards")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  if (name === "pen")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    )
  if (name === "sparkle")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    )
  if (name === "cake")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
        <path d="M2 21h20" />
        <path d="M7 8v3" />
        <path d="M12 8v3" />
        <path d="M17 8v3" />
        <path d="M7 4h.01" />
        <path d="M12 4h.01" />
        <path d="M17 4h.01" />
      </svg>
    )
  if (name === "heart")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    )
  if (name === "trophy")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    )
  if (name === "tree")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 4 15h16Z" />
        <path d="M12 8 6 18h12Z" />
        <path d="M10 22h4" />
        <path d="M12 18v4" />
      </svg>
    )
  if (name === "wand")
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 4V2" />
        <path d="M15 16v-2" />
        <path d="M8 9h2" />
        <path d="M20 9h2" />
        <path d="M17.8 11.8 19 13" />
        <path d="M15 9h.01" />
        <path d="M17.8 6.2 19 5" />
        <path d="m3 21 9-9" />
        <path d="M12.2 6.2 11 5" />
      </svg>
    )
  // envelope
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    try {
      const { cards: cardData } = await apiFetch<{ cards: CardItem[] }>(
        "/api/cards",
      )
      setCards(cardData ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser()
      if (!u) {
        router.push("/auth/login")
        return
      }
      setUser(u)
      await loadCards()
    }
    void checkAuth()
  }, [router, supabase, loadCards])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiDelete(`/api/cards/${id}`)
      setCards((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  // Derived
  const filteredCards =
    activeFilter === "all"
      ? cards
      : cards.filter((c) => c.card_type === activeFilter)

  const typeCounts = cards.reduce<Record<string, number>>((acc, c) => {
    acc[c.card_type] = (acc[c.card_type] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-[240px] shrink-0 flex-col border-r border-border bg-background lg:flex">
          <div className="flex-1 space-y-1 px-5 py-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-2.5"
              >
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <Skeleton
                  className="h-3.5 flex-1 rounded-sm"
                  style={{ maxWidth: `${60 + (i % 3) * 15}%` }}
                />
                <Skeleton className="h-3 w-4 rounded-sm" />
              </div>
            ))}
          </div>
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-2.5 w-14 rounded-sm" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-9 *:mx-auto *:max-w-7xl md:px-10">
          <div className="mb-7 flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-10 w-36 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-sm" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <Skeleton
                  className="w-full rounded-none"
                  style={{ aspectRatio: "4/5" }}
                />
                <div className="space-y-2 p-[18px]">
                  <div className="flex items-baseline justify-between">
                    <Skeleton className="h-[17px] w-28 rounded-sm" />
                    <Skeleton className="h-3 w-10 rounded-sm" />
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded-sm" />
                  <div className="mt-3.5 flex justify-end">
                    <Skeleton className="h-3 w-14 rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1">
      {/* ── Left sidebar ── */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-[240px] shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex-1 overflow-y-auto px-5 py-7">
          {/* Nav items */}
          {[
            {
              key: "all",
              icon: "cards",
              label: "All cards",
              count: cards.length,
            },
            {
              key: "birthday",
              icon: "cake",
              label: "Birthday",
              count: typeCounts["birthday"] ?? 0,
            },
            {
              key: "thank_you",
              icon: "heart",
              label: "Thank you",
              count: typeCounts["thank_you"] ?? 0,
            },
            {
              key: "congratulations",
              icon: "trophy",
              label: "Congratulations",
              count: typeCounts["congratulations"] ?? 0,
            },
            {
              key: "holiday",
              icon: "tree",
              label: "Holiday",
              count: typeCounts["holiday"] ?? 0,
            },
            {
              key: "custom",
              icon: "wand",
              label: "Custom",
              count: typeCounts["custom"] ?? 0,
            },
          ].map((item) => {
            const isActive = activeFilter === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveFilter(item.key)}
                className={`mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "border-border bg-card text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <NavIcon name={item.icon} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-xs text-muted-foreground/60">
                  {item.count || ""}
                </span>
              </button>
            )
          })}
        </div>

        {/* User profile */}
        {user && (
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials(user)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] leading-tight font-medium">
                  {displayName(user)}
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  Free plan
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-6 py-9 *:mx-auto *:max-w-7xl md:px-10">
        {/* Page header */}
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h1 className="text-[40px] leading-none font-semibold tracking-[-0.03em]">
              {activeFilter === "all"
                ? "All cards"
                : (TYPE_LABEL[activeFilter] ?? activeFilter)}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {filteredCards.length}{" "}
              {filteredCards.length === 1 ? "card" : "cards"}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild size="default">
              <Link href="/create">+ New card</Link>
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {filteredCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-[-0.02em]">
              {activeFilter === "all" ? "No cards yet" : "No cards here"}
            </h2>
            <p className="mx-auto mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {activeFilter === "all"
                ? "Create your first greeting card. It only takes a sentence."
                : `You don't have any ${TYPE_LABEL[activeFilter]?.toLowerCase() ?? activeFilter} cards yet.`}
            </p>
            <Button asChild size="lg">
              <Link href="/create">Create your first card</Link>
            </Button>
          </div>
        )}

        {/* Cards grid */}
        {filteredCards.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {filteredCards.map((card, index) => {
              const hue = TYPE_HUE[card.card_type] ?? 40
              const isConfirming = confirmDeleteId === card.id
              const isDeleting = deletingId === card.id
              return (
                <div key={card.id} className="group relative">
                  <Link
                    href={`/dashboard/cards/${card.id}`}
                    className="block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
                  >
                    {/* Image */}
                    <div
                      className="relative w-full overflow-hidden bg-secondary"
                      style={{ aspectRatio: "4/5" }}
                    >
                      {card.image_url ? (
                        <Image
                          src={card.image_url}
                          alt={`${card.recipient_name}'s card`}
                          fill
                          loading={index === 0 ? "eager" : "lazy"}
                          priority={index === 0}
                          unoptimized={looksLikeDataUrl(card.image_url)}
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background: `linear-gradient(135deg, oklch(0.9 0.08 ${hue}) 0%, oklch(0.78 0.13 ${hue - 15}) 100%)`,
                          }}
                        />
                      )}

                      {/* Type badge — top left */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className="inline-flex items-center rounded-full bg-white/92 px-2.5 py-1 text-[11.5px] font-medium text-foreground shadow-sm backdrop-blur-sm">
                          {TYPE_LABEL[card.card_type] ??
                            card.card_type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-[18px]">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[17px] font-medium tracking-[-0.01em]">
                          For {card.recipient_name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(card.created_at).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        From {card.sender_name}
                      </p>

                      <div className="mt-3.5 flex w-full items-center justify-end gap-3">
                        <span className="text-[12.5px] text-muted-foreground">
                          View card
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Delete button — visible on hover */}
                  {!isConfirming && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConfirmDeleteId(card.id)}
                      className="absolute top-3 right-3 rounded-full bg-white/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                      aria-label="Delete card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Delete confirmation overlay */}
                  {isConfirming && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/90 backdrop-blur-sm">
                      <div className="text-center">
                        <p className="mb-4 text-sm font-medium">
                          Delete this card?
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => handleDelete(card.id)}
                          >
                            {isDeleting ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
