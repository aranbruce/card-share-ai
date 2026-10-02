/**
 * Picks one of `options` from a seed string: spread evenly across seeds, but always the same
 * pick for the same seed (e.g. a card's link ID, so a card keeps its look between visits).
 */
export function pickBySeed<T>(seed: string, options: readonly T[]): T {
  if (options.length === 0)
    throw new Error("pickBySeed needs at least one option")
  // FNV-1a: a fast, well-spread string hash.
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return options[(hash >>> 0) % options.length]
}
