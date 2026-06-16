import { join } from "node:path";

import { isNonEmptyString } from "@acdh-oeaw/lib";
import { config as dotenv } from "@dotenvx/dotenvx";
import { type PlaywrightTestConfig, defineConfig, devices } from "@playwright/test";
import isCI from "is-in-ci";

/**
 * Reading `.env` files here instead of using `dotenvx run` so environment variables are available
 * to the vs code plugin as well.
 */
dotenv({
	path: [".env.test.local", ".env.local", ".env.test", ".env"].map((filePath) =>
		join(import.meta.dirname, "..", filePath),
	),
	ignore: ["MISSING_ENV_FILE"],
	quiet: true,
});

/** Playwright does not export the single web server config type, so we derive it. */
type WebServer = Extract<NonNullable<PlaywrightTestConfig["webServer"]>, { command: string }>;

/**
 * Tests under these directories require a specific authenticated storage state and run in their own
 * projects (`admin`, `non-admin`, `nc`, `wgchair`, `reporter`). The cross-browser projects must
 * ignore them so they only run once, under the matching identity.
 */
const authenticatedProjectGlobs = [
	"**/admin/**/*.test.ts",
	"**/non-admin/**/*.test.ts",
	"**/nc/**/*.test.ts",
	"**/wgchair/**/*.test.ts",
	"**/reporter/**/*.test.ts",
];

function getConfig():
	| { kind: "remote"; baseUrl: string; webServer: undefined }
	| { kind: "local"; baseUrl: string; webServer: WebServer } {
	// oxlint-disable-next-line node/no-process-env
	const remoteBaseUrl = process.env.PLAYWRIGHT_TEST_APP_BASE_URL;

	if (isNonEmptyString(remoteBaseUrl)) {
		return {
			kind: "remote",
			baseUrl: remoteBaseUrl,
			webServer: undefined,
		};
	}

	// oxlint-disable-next-line node/no-process-env
	const port = Number(process.env.PORT) || 3001;
	const baseUrl = `http://localhost:${String(port)}`;

	return {
		kind: "local",
		baseUrl,
		webServer: {
			command: `pnpm run --filter "@dariah-eric/knowledge-base" start --port ${String(port)}`,
			url: baseUrl,
			reuseExistingServer: !isCI,
			env: {
				/**
				 * Enables the `x-e2e-force-failure` test header in createServerAction. The header itself is
				 * only honored when this flag is set on the server.
				 */
				E2E_FAILURE_INJECTION: "1",
			},
		},
	};
}

/**
 * Server actions dispatch revalidation webhooks via `after()`. The real endpoint is not available
 * during e2e tests, so we run a stand-in that answers with `204` to keep the server logs clean.
 */
function getWebhookMockServer(): WebServer | undefined {
	// oxlint-disable-next-line node/no-process-env
	const webhookUrl = process.env.REVALIDATION_WEBHOOK_URL;

	if (!isNonEmptyString(webhookUrl)) {
		return undefined;
	}

	const port = Number(new URL(webhookUrl).port) || 3002;

	return {
		command: `tsx ${join(import.meta.dirname, "lib/webhook-mock-server.ts")}`,
		port,
		reuseExistingServer: !isCI,
	};
}

const config = getConfig();

const webServers: Array<WebServer> = [];

if (config.kind === "local") {
	const webhookMockServer = getWebhookMockServer();
	if (webhookMockServer != null) {
		webServers.push(webhookMockServer);
	}
}

if (config.webServer != null) {
	webServers.push(config.webServer);
}

export default defineConfig({
	testDir: "../e2e",
	snapshotDir: "../e2e/snapshots",
	timeout: isCI ? 60_000 : 30_000,
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	maxFailures: 10,
	workers: isCI ? 2 : undefined,
	reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["html"]],
	globalSetup: "./lib/global-setup.ts",
	globalTeardown: "./lib/global-teardown.ts",
	use: {
		baseURL: config.baseUrl,
		navigationTimeout: isCI ? 60_000 : 30_000,
		screenshot: "on-first-failure",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			testIgnore: authenticatedProjectGlobs,
			use: { ...devices["Desktop Chrome"], channel: "chromium" },
		},
		{
			name: "firefox",
			testIgnore: authenticatedProjectGlobs,
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			testIgnore: authenticatedProjectGlobs,
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "admin",
			testMatch: "**/admin/**/*.test.ts",
			use: {
				...devices["Desktop Chrome"],
				storageState: join(import.meta.dirname, ".auth/admin.json"),
			},
		},
		{
			name: "non-admin",
			testMatch: "**/non-admin/**/*.test.ts",
			use: {
				...devices["Desktop Chrome"],
				storageState: join(import.meta.dirname, ".auth/non-admin.json"),
			},
		},
		/**
		 * Relation-derived reporting personas, authenticated via the storage states written in
		 * `global-setup` (see `seedReportingPersonas`). `nc` = national coordinator, `wgchair` =
		 * working-group chair, `reporter` = WG member + country coordination staff (edits, cannot
		 * confirm).
		 */
		{
			name: "nc",
			testMatch: "**/nc/**/*.test.ts",
			use: {
				...devices["Desktop Chrome"],
				storageState: join(import.meta.dirname, ".auth/nc.json"),
			},
		},
		{
			name: "wgchair",
			testMatch: "**/wgchair/**/*.test.ts",
			use: {
				...devices["Desktop Chrome"],
				storageState: join(import.meta.dirname, ".auth/wgchair.json"),
			},
		},
		{
			name: "reporter",
			testMatch: "**/reporter/**/*.test.ts",
			use: {
				...devices["Desktop Chrome"],
				storageState: join(import.meta.dirname, ".auth/reporter.json"),
			},
		},
		/** Test against mobile viewports. */
		// {
		//     name: "Mobile Chrome",
		//     use: { ...devices["Pixel 5"] },
		// },
		// {
		//     name: "Mobile Safari",
		//     use: { ...devices["iPhone 12"] },
		// },
		/** Test against branded browsers. */
		// {
		//     name: "Microsoft Edge",
		//     use: { ...devices["Desktop Edge"], channel: "msedge" },
		// },
		// {
		//     name: "Google Chrome",
		//     use: { ...devices["Desktop Chrome"], channel: "chrome" },
		// },
	],
	webServer: webServers,
});
