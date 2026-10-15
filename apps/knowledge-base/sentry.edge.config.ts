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
	 * Tracing is handled by our own OpenTelemetry collector, not by Sentry. See
	 * `sentry.server.config.ts`.
	 */
	enableOpenTelemetrySetup: false,
	integrations: [Sentry.openTelemetryIntegration()],
});
