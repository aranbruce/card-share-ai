import { isIP } from "node:net"
import { MAX_SOURCE_IMAGE_BYTES } from "@/lib/source-image-limits"

const FETCH_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 6

/** Lowercased hostnames allowed for HTTPS source images (SSRF mitigation). */
export function getHttpsSourceImageAllowlist(): Set<string> {
  const hosts = new Set<string>()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname.toLowerCase())
    } catch {
      // ignore invalid env; callers treat empty allowlist as "no https urls"
    }
  }
  const extra = process.env.SOURCE_IMAGE_HTTPS_HOSTS?.trim()
  if (extra) {
    for (const h of extra.split(",")) {
      const t = h.trim().toLowerCase()
      if (t) hosts.add(t)
    }
  }
  return hosts
}

function isHostnameBlocked(ipLiteral: string): boolean {
  const v = isIP(ipLiteral)
  if (v === 4) {
    const [a, b] = ipLiteral.split(".").map(Number)
    if (a === 127) return true
    if (a === 10) return true
    if (a === 0) return true
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true
    return false
  }
  if (v === 6) {
    const s = ipLiteral.toLowerCase()
    if (s === "::1") return true
    if (s.startsWith("fc") || s.startsWith("fd")) return true
    if (s.startsWith("fe80:")) return true
    if (s.startsWith("::ffff:")) {
      const m = s.slice(7)
      if (isIP(m) === 4 && isHostnameBlocked(m)) return true
    }
    return false
  }
  return false
}

function assertHttpsSourceImageUrl(url: URL, allow: Set<string>): string | null {
  if (url.protocol !== "https:") {
    return "Source image URL must use https"
  }
  if (url.username || url.password) {
    return "Source image URL must not include credentials"
  }
  const port = url.port
  if (port && port !== "443") {
    return "Source image URL must use the default HTTPS port"
  }
  const host = url.hostname.toLowerCase()
  if (!host) {
    return "Invalid source image URL"
  }
  if (isHostnameBlocked(host)) {
    return "Source image URL host is not allowed"
  }
  if (!allow.has(host)) {
    if (allow.size === 0) {
      return "HTTPS source images are disabled (configure NEXT_PUBLIC_SUPABASE_URL or SOURCE_IMAGE_HTTPS_HOSTS)"
    }
    return "Source image URL must use an allowed host (e.g. your Supabase project domain)"
  }
  return null
}

async function readBodyWithCap(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > maxBytes) {
      throw new Error("Image exceeds maximum size")
    }
    return buf
  }
  const chunks: Buffer[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      reader.cancel().catch(() => {})
      throw new Error("Image exceeds maximum size")
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

/**
 * Fetches an image from an allowlisted https URL with bounded redirects, timeout,
 * and size limits. Never forwards arbitrary URLs to upstream models.
 */
export async function fetchHttpsSourceImageBytes(
  urlString: string,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string }> {
  const allow = getHttpsSourceImageAllowlist()
  let current: URL
  try {
    current = new URL(urlString)
  } catch {
    return { ok: false, message: "Invalid source image URL" }
  }

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const hostErr = assertHttpsSourceImageUrl(current, allow)
    if (hostErr) {
      return { ok: false, message: hostErr }
    }

    let res: Response
    try {
      res = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          Accept: "image/*,*/*;q=0.8",
        },
      })
    } catch {
      return { ok: false, message: "Failed to fetch source image" }
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) {
        return { ok: false, message: "Invalid redirect from source image URL" }
      }
      try {
        current = new URL(loc, current)
      } catch {
        return { ok: false, message: "Invalid redirect from source image URL" }
      }
      continue
    }

    if (!res.ok) {
      return { ok: false, message: "Failed to fetch source image" }
    }

    const ct = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? ""
    if (!ct.startsWith("image/")) {
      return { ok: false, message: "Source URL must respond with an image content type" }
    }

    const cl = res.headers.get("content-length")
    if (cl) {
      const n = Number(cl)
      if (Number.isFinite(n) && n > MAX_SOURCE_IMAGE_BYTES) {
        return { ok: false, message: "Source image exceeds maximum size" }
      }
    }

    try {
      const bytes = await readBodyWithCap(res, MAX_SOURCE_IMAGE_BYTES)
      if (bytes.length === 0) {
        return { ok: false, message: "Source image is empty" }
      }
      return { ok: true, bytes }
    } catch {
      return { ok: false, message: "Source image exceeds maximum size" }
    }
  }

  return { ok: false, message: "Too many redirects while fetching source image" }
}
