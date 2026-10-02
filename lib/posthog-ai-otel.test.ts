import { randomBytes } from "node:crypto"
import { OpenTelemetry } from "@ai-sdk/otel"
import { tracing } from "@opentelemetry/sdk-node"
import { PostHogSpanProcessor } from "@posthog/ai/otel"
import { generateText } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"

const { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } =
  tracing

/**
 * The AI SDK records prompts and outputs on spans, including uploaded photos as base64.
 * We promise users we don't keep their photos, so they must never reach PostHog: this
 * pins that `PostHogSpanProcessor` (as used in `lib/posthog-ai-otel.ts`) redacts them.
 */
async function exportedSpans(photo: Uint8Array | string, cover: string) {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({
    spanProcessors: [
      new PostHogSpanProcessor({
        projectToken: "phc_test",
        // Swaps the OTLP exporter for an in-memory one.
        _spanProcessor: new SimpleSpanProcessor(exporter),
      }),
    ],
  })

  await generateText({
    model: new MockLanguageModelV4({
      doGenerate: {
        content: [
          { type: "text", text: "ok" },
          {
            type: "file",
            mediaType: "image/png",
            data: { type: "data", data: cover },
          },
        ],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 1,
            noCache: undefined,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 1, text: undefined, reasoning: undefined },
        },
        warnings: [],
      },
    }),
    prompt: [
      {
        role: "user",
        content: [
          { type: "file", data: photo, mediaType: "image/jpeg" },
          { type: "text", text: "Put them on the moon" },
        ],
      },
    ],
    telemetry: {
      functionId: "generate-card-cover-art",
      integrations: new OpenTelemetry({ tracer: provider.getTracer("test") }),
    },
  })
  await provider.forceFlush()

  const spans = exporter.getFinishedSpans()
  return {
    count: spans.length,
    dump: JSON.stringify(
      spans.map((s) => ({ attributes: s.attributes, events: s.events })),
    ),
  }
}

/** True if any slice of the base64 payload appears in the exported spans. */
const leaks = (dump: string, base64: string) =>
  [0, base64.length / 2, base64.length - 100].some((i) =>
    dump.includes(base64.slice(i, i + 80)),
  )

describe("PostHog AI spans", () => {
  // Random bytes, so the base64 can't pass for ordinary text.
  const photo = new Uint8Array(randomBytes(200_000))
  const photoBase64 = Buffer.from(photo).toString("base64")
  const coverBase64 = Buffer.from(randomBytes(150_000)).toString("base64")

  it.each([
    ["bytes", photo],
    ["a data URL", `data:image/jpeg;base64,${photoBase64}`],
  ])("redact an uploaded photo sent as %s", async (_, input) => {
    const { count, dump } = await exportedSpans(input, coverBase64)
    expect(count).toBeGreaterThan(0)
    expect(leaks(dump, photoBase64)).toBe(false)
    expect(leaks(dump, coverBase64)).toBe(false)
    expect(dump).toContain("[base64 image/jpeg redacted]")
    // Text prompts are still recorded.
    expect(dump).toContain("Put them on the moon")
  })
})
