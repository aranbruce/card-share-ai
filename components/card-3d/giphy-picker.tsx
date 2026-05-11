"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

type GiphyGif = {
  id: string
  title: string
  previewUrl: string
  gifUrl: string
  /** Pixels for fixed_width preview from Giphy (used for correct aspect in the grid). */
  previewWidth?: number | null
  previewHeight?: number | null
}

function normalizeGifList(raw: unknown): GiphyGif[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): GiphyGif | null => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const title = typeof row.title === "string" ? row.title : "GIF"
      const previewUrl =
        typeof row.previewUrl === "string" ? row.previewUrl : null
      const gifUrl = typeof row.gifUrl === "string" ? row.gifUrl : null
      if (!previewUrl || !gifUrl) return null
      const id = typeof row.id === "string" && row.id ? row.id : gifUrl
      const rawPw = row.previewWidth
      const rawPh = row.previewHeight
      const parsedPw =
        typeof rawPw === "string" ? Number.parseInt(rawPw, 10) : null
      const parsedPh =
        typeof rawPh === "string" ? Number.parseInt(rawPh, 10) : null
      const pw =
        typeof rawPw === "number" && Number.isFinite(rawPw) && rawPw > 0
          ? rawPw
          : parsedPw !== null && Number.isFinite(parsedPw) && parsedPw > 0
            ? parsedPw
            : null
      const ph =
        typeof rawPh === "number" && Number.isFinite(rawPh) && rawPh > 0
          ? rawPh
          : parsedPh !== null && Number.isFinite(parsedPh) && parsedPh > 0
            ? parsedPh
            : null
      return {
        id,
        title,
        previewUrl,
        gifUrl,
        previewWidth: pw,
        previewHeight: ph,
      }
    })
    .filter((item): item is GiphyGif => item !== null)
}

const LIMIT = 20

export function GiphyPicker({
  open,
  onOpenChange,
  selectedUrl,
  onSelect,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  selectedUrl: string | null | undefined
  onSelect: (url: string) => void
}) {
  const [query, setQuery] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gifs, setGifs] = useState<GiphyGif[]>([])

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery("")
        setSearchTerm("")
        setOffset(0)
        setHasMore(false)
        setGifs([])
        setError(null)
      }
      onOpenChange(next)
    },
    [onOpenChange],
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const controller = new AbortController()
    const isLoadMore = offset > 0

    async function run() {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const url = new URL("/api/giphy/search", window.location.origin)
        if (searchTerm.trim()) {
          url.searchParams.set("q", searchTerm.trim())
        }
        url.searchParams.set("limit", String(LIMIT))
        url.searchParams.set("offset", String(offset))
        const res = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg =
            typeof payload.error === "string"
              ? payload.error
              : "Failed to load GIFs"
          throw new Error(msg)
        }
        if (cancelled) return
        const next = normalizeGifList(payload.gifs)
        setGifs((prev) => (isLoadMore ? [...prev, ...next] : next))
        setHasMore(next.length >= LIMIT)
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "Failed to load GIFs"
        setError(msg)
        if (!isLoadMore) setGifs([])
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, searchTerm, offset])

  const title = useMemo(
    () =>
      searchTerm.trim() ? `Results for "${searchTerm.trim()}"` : "Trending",
    [searchTerm],
  )

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>Choose a GIF</DialogTitle>
          <DialogDescription>
            Search Giphy and add a GIF to this message.
          </DialogDescription>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setOffset(0)
              setHasMore(false)
              setSearchTerm(query.trim())
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search GIFs"
                placeholder="Search GIFs (e.g. birthday cake)"
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col overflow-hidden px-6 py-4">
          <p className="mb-3 text-xs text-muted-foreground">{title}</p>
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : gifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No GIFs found.</p>
          ) : (
            /*
             * CSS columns (masonry): each GIF keeps its natural height. A CSS grid
             * forces every cell in a row to the row height, so previews looked like
             * identical wide strips even when aspect ratios differed.
             */
            <div className="max-h-[min(55vh,28rem)] min-h-0 overflow-x-hidden overflow-y-auto pb-2 [scrollbar-gutter:stable]">
              <div className="columns-2 gap-x-3 [column-fill:balance] sm:columns-3">
                {gifs.map((gif) => {
                  const isSelected = (selectedUrl ?? null) === gif.gifUrl
                  const hasPreviewDims =
                    typeof gif.previewWidth === "number" &&
                    gif.previewWidth > 0 &&
                    typeof gif.previewHeight === "number" &&
                    gif.previewHeight > 0
                  return (
                    <button
                      key={gif.id}
                      type="button"
                      className={`group relative mb-3 w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg border text-left transition ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        onSelect(gif.gifUrl)
                        handleDialogOpenChange(false)
                      }}
                      title={gif.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        width={
                          hasPreviewDims
                            ? (gif.previewWidth ?? undefined)
                            : undefined
                        }
                        height={
                          hasPreviewDims
                            ? (gif.previewHeight ?? undefined)
                            : undefined
                        }
                        className="block h-auto max-h-none w-full bg-muted object-contain align-bottom"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="pointer-events-none absolute right-2 bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-left text-[11px] leading-tight text-white opacity-0 transition group-hover:opacity-100">
                        {gif.title}
                      </div>
                    </button>
                  )
                })}
              </div>
              {hasMore && !error && (
                <div className="flex w-full justify-center py-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loadingMore}
                    onClick={() => setOffset((prev) => prev + LIMIT)}
                    className="w-full"
                  >
                    {loadingMore ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t px-6 py-3">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Click a GIF to add it to your note. Press Esc or click outside to
            close.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
