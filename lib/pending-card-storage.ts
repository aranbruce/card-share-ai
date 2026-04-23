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
  localStorage.setItem(KEY, JSON.stringify(card))
}

/** Returns the stored card if present and valid, otherwise null. */
export function loadPendingCard(): PendingCard | null {
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
  return localStorage.getItem(KEY) !== null
}

export function clearPendingCard(): void {
  localStorage.removeItem(KEY)
}
