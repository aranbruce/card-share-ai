import type { TelemetryOptions } from "ai"
import { registerAiGatewayProvider } from "@/lib/ai-gateway-provider"
import { normalizePostHogDistinctId } from "@/lib/posthog-distinct-id"

registerAiGatewayProvider()

function isPostHogAiTelemetryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim())
}

type AiCallIdentity = {
  distinctId: string
}

type AiTelemetryOptions = {
  telemetry: TelemetryOptions<AiCallIdentity>
  runtimeContext?: AiCallIdentity
}

/**
 * Per-call AI SDK telemetry options. OpenTelemetry is registered globally when
 * PostHog is configured (`startPostHogAiOtel`); calls still pass `functionId`
 * and optional distinct ID via `runtimeContext`.
 */
export function aiTelemetry(
  functionId: string,
  distinctId?: string | null,
): AiTelemetryOptions {
  const normalizedDistinctId = normalizePostHogDistinctId(distinctId ?? null)

  const telemetry: TelemetryOptions<AiCallIdentity> = {
    // When PostHog is not configured, no OTEL integration is registered, so
    // this is defensive. When it is configured, omit isEnabled (opt-out only).
    ...(isPostHogAiTelemetryEnabled() ? {} : { isEnabled: false }),
    functionId,
  }

  if (!normalizedDistinctId) {
    return { telemetry }
  }

  return {
    telemetry: {
      ...telemetry,
      includeRuntimeContext: { distinctId: true },
    },
    runtimeContext: { distinctId: normalizedDistinctId },
  }
}
