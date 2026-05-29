import type { NextRequest } from "next/server"

/** Strip Supabase's `v1,whsec_` prefix; standardwebhooks expects the base64 secret only. */
export function normalizeSendEmailHookSecret(raw: string): string {
  return raw.replace(/^v1,whsec_/, "")
}

export function getSendEmailHookSecretFromEnv(): string | null {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.trim()
  if (!secret) return null
  return normalizeSendEmailHookSecret(secret)
}

export function getStandardWebhookHeaders(
  request: NextRequest,
): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const name of [
    "webhook-id",
    "webhook-timestamp",
    "webhook-signature",
  ] as const) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }
  return headers
}
