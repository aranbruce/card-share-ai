import type { NextRequest } from "next/server"

type FixedWindowRateLimitConfig = {
  namespace: string
  maxRequests: number
  windowMs: number
}

type FixedWindowEntry = {
  count: number
  resetAt: number
}

type FixedWindowStore = Map<string, FixedWindowEntry>

const RATE_LIMIT_STORE_SYMBOL = Symbol.for("cards-ai.rate-limit.store")

function getStore(): FixedWindowStore {
  const globalObj = globalThis as Record<symbol, unknown>
  const existing = globalObj[RATE_LIMIT_STORE_SYMBOL]
  if (existing instanceof Map) {
    return existing as FixedWindowStore
  }
  const store: FixedWindowStore = new Map()
  globalObj[RATE_LIMIT_STORE_SYMBOL] = store
  return store
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) return cfIp

  const requestWithIp = request as NextRequest & { ip?: string }
  if (requestWithIp.ip?.trim()) {
    return requestWithIp.ip.trim()
  }

  return "unknown"
}

export function checkFixedWindowRateLimit(
  request: NextRequest,
  config: FixedWindowRateLimitConfig,
): { allowed: boolean; headers: Record<string, string> } {
  const now = Date.now()
  const key = `${config.namespace}:${getClientIp(request)}`
  const store = getStore()

  const existing = store.get(key)
  const isExpired = !existing || now >= existing.resetAt
  const resetAt = isExpired ? now + config.windowMs : existing.resetAt
  const count = isExpired ? 1 : existing.count + 1

  store.set(key, { count, resetAt })

  const remaining = Math.max(0, config.maxRequests - count)
  const allowed = count <= config.maxRequests

  return {
    allowed,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      "Retry-After": String(Math.max(0, Math.ceil((resetAt - now) / 1000))),
    },
  }
}
