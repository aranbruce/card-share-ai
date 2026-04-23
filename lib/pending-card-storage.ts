import { z } from "zod"

const pendingCardSchema = z.object({
  cardType: z.string(),
  recipientName: z.string(),
  senderName: z.string(),
  copyHeadline: z.string(),
  copyMessage: z.string(),
  imageUrl: z.string(),
  imagePrompt: z.string(),
  extraPages: z.number(),
})

export type PendingCard = z.infer<typeof pendingCardSchema>

const KEY = "pendingCard"

export function savePendingCard(card: PendingCard): void {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(card))
}

/** Returns the stored card if present and valid, otherwise null. */
export function loadPendingCard(): PendingCard | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return pendingCardSchema.parse(JSON.parse(raw))
  } catch {
    localStorage.removeItem(KEY)
    return null
  }
}

export function hasPendingCard(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(KEY) !== null
}

export function clearPendingCard(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(KEY)
}
