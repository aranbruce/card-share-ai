import { afterEach, describe, expect, it, vi } from "vitest"
import {
  flushPostHogAiSpans,
  setPostHogAiSpanProcessor,
} from "./posthog-ai-flush"

afterEach(() => {
  setPostHogAiSpanProcessor(undefined)
  vi.restoreAllMocks()
})

describe("flushPostHogAiSpans", () => {
  it("is a no-op when no processor is registered", async () => {
    await expect(flushPostHogAiSpans()).resolves.toBeUndefined()
  })

  it("flushes the registered processor", async () => {
    const forceFlush = vi.fn().mockResolvedValue(undefined)
    setPostHogAiSpanProcessor({ forceFlush })

    await flushPostHogAiSpans()

    expect(forceFlush).toHaveBeenCalledOnce()
  })

  it("logs instead of throwing when the flush fails", async () => {
    const error = new Error("network down")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    setPostHogAiSpanProcessor({
      forceFlush: vi.fn().mockRejectedValue(error),
    })

    await expect(flushPostHogAiSpans()).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to flush PostHog AI spans:",
      error,
    )
  })

  it("reads the processor from globalThis so separate bundles share it", async () => {
    const forceFlush = vi.fn().mockResolvedValue(undefined)
    setPostHogAiSpanProcessor({ forceFlush })

    vi.resetModules()
    const fresh = await import("./posthog-ai-flush")
    await fresh.flushPostHogAiSpans()

    expect(forceFlush).toHaveBeenCalledOnce()
  })
})
