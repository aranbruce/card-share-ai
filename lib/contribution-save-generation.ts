/** Per-contribution save generations — ignore stale responses for the same row only. */
export function createContributionSaveGenerationTracker() {
  const generations = new Map<string, number>()

  return {
    next(contributionId: string): number {
      const generation = (generations.get(contributionId) ?? 0) + 1
      generations.set(contributionId, generation)
      return generation
    },
    isStale(contributionId: string, generation: number): boolean {
      return generations.get(contributionId) !== generation
    },
  }
}
