// @see {@link https://github.com/oxc-project/oxc/issues/20704}
// oxlint-disable import/namespace -- exports only exist in "browser" export condition

import * as Sentry from "@sentry/nextjs";

import { env } from "@/config/env.config";
import { getDataCollection } from "@/config/sentry.config";

Sentry.init({
	dsn: env.NEXT_PUBLIC_WEBSITE_SENTRY_DSN,
	integrations: [Sentry.replayIntegration()],
	replaysOnErrorSampleRate: 1,
	replaysSessionSampleRate: 0.1,
	/**
	 * Only collect personally identifiable information when explicitly enabled.
	 *
	 * @see {@link https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/}
	 */
	dataCollection: getDataCollection(env.NEXT_PUBLIC_WEBSITE_SENTRY_DATA_COLLECTION),
	tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
