import * as Sentry from "@sentry/nextjs";

import { env } from "@/config/env.config";
import { getDataCollection } from "@/config/sentry.config";

Sentry.init({
	dsn: env.NEXT_PUBLIC_APP_SENTRY_DSN,
	/**
	 * Only collect personally identifiable information when explicitly enabled.
	 *
	 * @see {@link https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/}
	 */
	dataCollection: getDataCollection(env.NEXT_PUBLIC_APP_SENTRY_DATA_COLLECTION),
	/**
	 * Tracing is handled by our own OpenTelemetry collector (configured in `instrumentation.ts` via
	 * `@vercel/otel`), not by Sentry. We only use Sentry for error reporting, so we leave the global
	 * OpenTelemetry provider to `@vercel/otel` and keep Sentry tracing disabled (no
	 * `tracesSampleRate`), which keeps us within the free-tier span quota. `openTelemetryIntegration`
	 * links captured errors to the active OpenTelemetry trace.
	 *
	 * @see {@link https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v10-to-v11/}
	 */
	enableOpenTelemetrySetup: false,
	integrations: [Sentry.openTelemetryIntegration()],
});
