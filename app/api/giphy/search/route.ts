import { NextRequest, NextResponse } from "next/server"
import { normalizeGiphyUrl } from "@/lib/giphy-url"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"

type GiphyResponse = {
  data?: Array<{
    id?: string
    title?: string
    images?: {
      fixed_width?: { url?: string; width?: string; height?: string }
      original?: { url?: string }
    }
  }>
  pagination?: { total_count?: number; count?: number; offset?: number }
}

export async function GET(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:giphy-search",
    maxRequests: 60,
    windowMs: 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimit.headers },
    )
  }

  try {
    const apiKey = process.env.GIPHY_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Giphy is not configured" },
        { status: 503, headers: rateLimit.headers },
      )
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() ?? ""
    const limitRaw = Number(searchParams.get("limit") ?? "20")
    const limit = Number.isFinite(limitRaw)
      ? Math.min(25, Math.max(1, Math.trunc(limitRaw)))
      : 20
    const offsetRaw = Number(searchParams.get("offset") ?? "0")
    const offset = Number.isFinite(offsetRaw)
      ? Math.max(0, Math.trunc(offsetRaw))
      : 0

    const endpoint = q.length > 0 ? "search" : "trending"
    const upstreamUrl = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`)
    upstreamUrl.searchParams.set("api_key", apiKey)
    upstreamUrl.searchParams.set("limit", String(limit))
    upstreamUrl.searchParams.set("offset", String(offset))
    upstreamUrl.searchParams.set("rating", "pg-13")
    if (q.length > 0) {
      upstreamUrl.searchParams.set("q", q)
    }

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GIFs from Giphy" },
        { status: 502, headers: rateLimit.headers },
      )
    }

    const payload = (await response.json()) as GiphyResponse
    const gifs = (payload.data ?? [])
      .map((item) => {
        const preview = item.images?.fixed_width
        const full = item.images?.original
        if (!preview?.url || !full?.url) return null
        const normalizedPreviewUrl = normalizeGiphyUrl(preview.url)
        const normalizedFullUrl = normalizeGiphyUrl(full.url)
        if (!normalizedPreviewUrl || !normalizedFullUrl) return null

        const previewWidth = Number.parseInt(preview.width ?? "0", 10) || null
        const previewHeight = Number.parseInt(preview.height ?? "0", 10) || null

        return {
          id: item.id ?? normalizedPreviewUrl,
          title: (item.title ?? "GIF").trim() || "GIF",
          previewUrl: normalizedPreviewUrl,
          gifUrl: normalizedFullUrl,
          previewWidth,
          previewHeight,
        }
      })
      .filter(
        (
          item,
        ): item is {
          id: string
          title: string
          previewUrl: string
          gifUrl: string
          previewWidth: number | null
          previewHeight: number | null
        } => item !== null,
      )

    const totalCount =
      typeof payload.pagination?.total_count === "number"
        ? payload.pagination.total_count
        : null
    const rawCount = payload.data?.length ?? 0
    const hasMore =
      totalCount !== null ? offset + limit < totalCount : rawCount === limit

    return NextResponse.json({ gifs, hasMore }, { headers: rateLimit.headers })
  } catch (error) {
    console.error("[GET /api/giphy/search]", error)
    return NextResponse.json(
      { error: "Failed to load GIFs" },
      { status: 500, headers: rateLimit.headers },
    )
  }
}
