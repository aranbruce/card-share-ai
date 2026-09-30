/** The subset of `PostHogSpanProcessor` needed to flush buffered spans. */
export type FlushableSpanProcessor = {
  forceFlush(): Promise<void>
}

// Kept on globalThis because instrumentation.ts and route handlers can be
// bundled separately, so module-level state isn't shared between them.
const PROCESSOR_KEY = Symbol.for("card-share-ai.posthogAiSpanProcessor")

type GlobalWithProcessor = typeof globalThis & {
  [PROCESSOR_KEY]?: FlushableSpanProcessor
}

/** Called by `startPostHogAiOtel` once OpenTelemetry has started. */
export function setPostHogAiSpanProcessor(
  processor: FlushableSpanProcessor | undefined,
): void {
  ;(globalThis as GlobalWithProcessor)[PROCESSOR_KEY] = processor
}

/**
 * Exports buffered AI spans to PostHog. Serverless instances can freeze once the
 * response is sent, so call this via `after()` when a request ran AI work.
 * No-op when PostHog AI telemetry isn't running; never throws.
 */
export async function flushPostHogAiSpans(): Promise<void> {
  const processor = (globalThis as GlobalWithProcessor)[PROCESSOR_KEY]
  if (!processor) return
  try {
    await processor.forceFlush()
  } catch (error) {
    console.error("Failed to flush PostHog AI spans:", error)
  }
}
