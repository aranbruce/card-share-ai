export const MIN_CONTRIBUTION_ROTATION_DEGREES = -12
export const MAX_CONTRIBUTION_ROTATION_DEGREES = 12

/**
 * Validates and normalizes message rotation in degrees.
 * - `undefined`: field omitted
 * - `null`: clear rotation
 * - `number`: clamped to a subtle range and rounded to integer degrees
 */
export function normalizeContributionRotationDegrees(
  val: unknown,
): number | null | undefined {
  if (val === undefined) return undefined
  if (val === null) return null
  if (typeof val !== "number" || !Number.isFinite(val)) return undefined
  const clamped = Math.max(
    MIN_CONTRIBUTION_ROTATION_DEGREES,
    Math.min(MAX_CONTRIBUTION_ROTATION_DEGREES, val),
  )
  return Math.round(clamped)
}
