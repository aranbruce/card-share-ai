import { createHmac, randomBytes, timingSafeEqual } from "crypto"

export interface LinkTokenPayload {
  platform: string
  platformUserId: string
  platformTeamId?: string
}

function sign(nonce: string, payload: LinkTokenPayload): string {
  const secret = process.env.BOT_LINK_SECRET
  if (!secret) throw new Error("BOT_LINK_SECRET is not configured")
  const data = `${nonce}:${payload.platform}:${payload.platformUserId}:${payload.platformTeamId ?? ""}`
  return createHmac("sha256", secret).update(data).digest("hex")
}

export function generateLinkToken(payload: LinkTokenPayload): string {
  const nonce = randomBytes(32).toString("hex")
  const sig = sign(nonce, payload)
  return `${nonce}.${sig}`
}

export function verifyLinkToken(
  token: string,
  payload: LinkTokenPayload,
): boolean {
  const dotIndex = token.indexOf(".")
  if (dotIndex === -1) return false
  const nonce = token.slice(0, dotIndex)
  const provided = token.slice(dotIndex + 1)
  try {
    const expected = sign(nonce, payload)
    const a = Buffer.from(expected, "hex")
    const b = Buffer.from(provided, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
