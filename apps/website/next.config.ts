import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig as Config } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { env } from "./config/env.config.ts";

const config: Config = {
	allowedDevOrigins: ["127.0.0.1"],
	// cacheComponents: true,
	/** Compression should be handled by the `nginx` reverse proxy. */
	compress: false,
	experimental: {
		browserDebugInfoInTerminal: true,
		globalNotFound: true,
		rootParams: true,
		turbopackFileSystemCacheForDev: true,
		viewTransition: true,
	},
	headers() {
		const headers: Awaited<ReturnType<NonNullable<Config["headers"]>>> = [
			/** @see {@link https://nextjs.org/docs/app/guides/self-hosting#streaming-and-suspense} */
			{ source: "/:path*{/}?", headers: [{ key: "x-accel-buffering", value: "no" }] },
		];

		return headers;
	},
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	output: env.BUILD_MODE,
	reactCompiler: true,
	turbopack: {
		rules: {
			/** @see {@link https://github.com/vercel/next.js/discussions/77721#discussioncomment-14576268} */
			"*": {
				condition: {
					all: [
						"foreign",
						"browser",
						{
							path: /(@react-stately|@react-aria|@react-spectrum|react-aria-components)\/.*\/[a-z]{2}-[A-Z]{2}/,
						},
					],
				},
				loaders: ["null-loader"],
				as: "*.js",
			},
		},
	},
	// typedRoutes: true,
	typescript: {
		ignoreBuildErrors: true,
	},
};

const plugins: Array<(config: Config) => Config> = [
	createNextIntlPlugin({
		experimental: {
			/** @see {@link https://next-intl.dev/docs/workflows/typescript#messages-arguments} */
			createMessagesDeclaration: ["./content/en/metadata/index.json", "./messages/en.json"],
		},
		requestConfig: "./lib/i18n/request.ts",
	}),
	function createSentryPlugin(config) {
		return withSentryConfig(config, {
			org: env.NEXT_PUBLIC_WEBSITE_SENTRY_ORG,
			project: env.NEXT_PUBLIC_WEBSITE_SENTRY_PROJECT,
			silent: env.CI !== true,
			/**
			 * Route browser requests to `sentry` through a `next.js` rewrite to circumvent ad-blockers.
			 */
			tunnelRoute: "/monitoring",
			webpack: {
				reactComponentAnnotation: {
					enabled: true,
				},
				treeshake: {
					removeDebugLogging: true,
				},
			},
			widenClientFileUpload: true,
		});
	},
];

export default plugins.reduce((config, plugin) => {
	return plugin(config);
}, config);
