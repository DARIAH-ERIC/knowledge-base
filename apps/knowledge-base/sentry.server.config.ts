import * as Sentry from "@sentry/nextjs";

import { env } from "@/config/env.config";

Sentry.init({
	dsn: env.NEXT_PUBLIC_APP_SENTRY_DSN,
	enableLogs: true,
	/**
	 * Enable sending personally identifiable information.
	 *
	 * @see {@link https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/}
	 */
	sendDefaultPii: env.NEXT_PUBLIC_APP_SENTRY_PII === "enabled",
	/**
	 * Tracing is handled by our own OpenTelemetry collector (configured in `instrumentation.ts` via
	 * `@vercel/otel`), not by Sentry. We only use Sentry for error reporting, so we leave the global
	 * OpenTelemetry provider to `@vercel/otel` and send no transactions to Sentry (which keeps us
	 * within the free-tier span quota).
	 *
	 * @see {@link https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/custom-setup/}
	 */
	skipOpenTelemetrySetup: true,
	tracesSampleRate: 0,
});
