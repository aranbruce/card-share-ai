import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"

export function verifyBotSecret(request: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return false

  const provided = authHeader.slice(7)
  try {
    const a = Buffer.from(secret, "utf8")
    const b = Buffer.from(provided, "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
