import { createHmac, timingSafeEqual } from "node:crypto"
import { getAppUrl } from "@/lib/app-url"

/** What a photo upload from the MCP card view may do, signed into its token. */
export type PhotoTokenPayload =
  | { purpose: "card-photo"; userId: string; cardId: string }
  | {
      purpose: "new-card-photo"
      userId: string
      card: {
        recipientName: string
        senderName: string
        cardType: string
        tone: string
        context?: string
      }
    }

type SignedPayload = PhotoTokenPayload & { exp: number }

/** Long enough to find a photo and wait out generation; short enough to be useless if leaked. */
export const PHOTO_TOKEN_TTL_SECONDS = 30 * 60

function secret(): string | null {
  return process.env.MCP_PHOTO_TOKEN_SECRET || null
}

/** Whether photo uploads from the card view are configured. */
export function photoUploadsEnabled(): boolean {
  return secret() !== null
}

function sign(body: string, key: string): string {
  return createHmac("sha256", key)
    .update(`mcp-photo-token:${body}`)
    .digest("base64url")
}

export function createPhotoToken(
  payload: PhotoTokenPayload,
  now = Date.now(),
): string {
  const key = secret()
  if (!key) throw new Error("MCP_PHOTO_TOKEN_SECRET is not configured")
  const signed: SignedPayload = {
    ...payload,
    exp: Math.floor(now / 1000) + PHOTO_TOKEN_TTL_SECONDS,
  }
  const body = Buffer.from(JSON.stringify(signed)).toString("base64url")
  return `${body}.${sign(body, key)}`
}

/** The token's payload when its signature is valid and it hasn't expired. */
export function verifyPhotoToken(
  token: string,
  now = Date.now(),
): PhotoTokenPayload | null {
  const key = secret()
  if (!key) return null
  const [body, provided, ...rest] = token.split(".")
  if (!body || !provided || rest.length) return null

  const expected = Buffer.from(sign(body, key))
  const actual = Buffer.from(provided)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }

  try {
    const { exp, ...payload } = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SignedPayload
    if (typeof exp !== "number" || exp < now / 1000) return null
    return payload as PhotoTokenPayload
  } catch {
    return null
  }
}

/** What the card view needs to upload a photo, or null when uploads are off. */
export function photoUploadFor(
  payload: PhotoTokenPayload,
): { token: string; url: string } | null {
  if (!photoUploadsEnabled()) return null
  return {
    token: createPhotoToken(payload),
    url: `${getAppUrl()}/api/mcp/photo`,
  }
}
