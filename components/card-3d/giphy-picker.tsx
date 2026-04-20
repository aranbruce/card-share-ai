"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogFooter,
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
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const id = typeof row.id === "string" ? row.id : ""
      const title = typeof row.title === "string" ? row.title : "GIF"
      const previewUrl =
        typeof row.previewUrl === "string" ? row.previewUrl : null
      const gifUrl = typeof row.gifUrl === "string" ? row.gifUrl : null
      if (!previewUrl || !gifUrl) return null
      const rawPw = row.previewWidth
      const rawPh = row.previewHeight
      const pw =
        typeof rawPw === "number" && Number.isFinite(rawPw) && rawPw > 0
          ? rawPw
          : typeof rawPw === "string"
            ? Number.parseInt(rawPw, 10) || null
            : null
      const ph =
        typeof rawPh === "number" && Number.isFinite(rawPh) && rawPh > 0
          ? rawPh
          : typeof rawPh === "string"
            ? Number.parseInt(rawPh, 10) || null
            : null
      return { id, title, previewUrl, gifUrl, previewWidth: pw, previewHeight: ph }
    })
    .filter((item): item is GiphyGif => item !== null)
}

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedGifUrl(selectedUrl ?? null)
  }, [open, selectedUrl])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const controller = new AbortController()

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const url = new URL("/api/giphy/search", window.location.origin)
        if (searchTerm.trim()) {
          url.searchParams.set("q", searchTerm.trim())
        }
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
        setGifs(normalizeGifList(payload.gifs))
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "Failed to load GIFs"
        setError(msg)
        setGifs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, searchTerm])

  const title = useMemo(
    () => (searchTerm.trim() ? `Results for "${searchTerm.trim()}"` : "Trending"),
    [searchTerm],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>Choose a GIF</DialogTitle>
          <DialogDescription>
            Search Giphy and add a GIF to this message.
          </DialogDescription>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setSearchTerm(query.trim())
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No GIFs found.</p>
          ) : (
            <div className="grid grid-cols-2 content-start items-start gap-3 overflow-y-auto pb-2 sm:grid-cols-3">
              {gifs.map((gif, index) => {
                const isSelected = selectedGifUrl === gif.gifUrl
                const hasPreviewDims =
                  typeof gif.previewWidth === "number" &&
                  gif.previewWidth > 0 &&
                  typeof gif.previewHeight === "number" &&
                  gif.previewHeight > 0
                return (
                  <button
                    key={gif.id ? gif.id : `${gif.gifUrl}-${index}`}
                    type="button"
                    className={`group relative min-w-0 self-start overflow-hidden rounded-lg border text-left transition ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setSelectedGifUrl(gif.gifUrl)
                      onSelect(gif.gifUrl)
                      onOpenChange(false)
                    }}
                    title={gif.title}
                  >
                    {/* Intrinsic <img> keeps Giphy preview aspect ratio; avoids grid stretch + fill/crop issues */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      width={
                        hasPreviewDims ? gif.previewWidth : undefined
                      }
                      height={
                        hasPreviewDims ? gif.previewHeight : undefined
                      }
                      className="block h-auto w-full bg-muted object-contain"
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
          )}
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            Click a GIF to add it to your note.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
