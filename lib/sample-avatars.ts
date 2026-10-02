/**
 * Stock faces for sample signers in marketing mockups: free-license Unsplash portraits,
 * face-cropped to 96px. In order, unsplash.com/photos/ mEZ3PoFGs_k, iFgRcqHznqg,
 * IF9TK5Uy-KI, AR9mvykzSOA, COOrCB6qqO0, UpiF461EAHU, MQ2xYBHImKM, v7Jja2ChN6s,
 * B41fY4dhX18, N8lRH2uxih4, y3kC_7Qhmjk and 0pOlBhSsF80.
 */
export const SAMPLE_AVATARS = Array.from(
  { length: 12 },
  (_, i) => `/avatars/person-${i + 1}.webp`,
)

/**
 * `count` different faces, the same every time for a given `seed` (e.g. a page's slug),
 * so server-rendered pages don't change faces on hydration.
 */
export function sampleAvatarsFor(seed: string, count: number): string[] {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const start = hash % SAMPLE_AVATARS.length
  return Array.from(
    { length: Math.min(count, SAMPLE_AVATARS.length) },
    (_, i) => SAMPLE_AVATARS[(start + i) % SAMPLE_AVATARS.length],
  )
}
