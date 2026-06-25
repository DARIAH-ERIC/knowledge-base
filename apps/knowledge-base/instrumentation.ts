import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";

import { env } from "@/config/env.config";

export async function register(): Promise<void> {
	/**
	 * Export traces to our own OpenTelemetry collector. `@vercel/otel` owns the global OpenTelemetry
	 * provider (Sentry opts out via `skipOpenTelemetrySetup`); the OTLP exporter reads
	 * `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_HEADERS` from the environment. Only
	 * register when a collector endpoint is configured, so this is a no-op in local development and
	 * CI.
	 */
	if (env.OTEL_EXPORTER_OTLP_ENDPOINT != null) {
		registerOTel({ serviceName: "dariah-knowledge-base" });
	}

	if (env.NEXT_RUNTIME === "nodejs") {
		await import("@/sentry.server.config");
	}

	if (env.NEXT_RUNTIME === "edge") {
		await import("@/sentry.edge.config");
	}
}

export const onRequestError = Sentry.captureRequestError;
