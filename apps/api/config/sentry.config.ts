import type { NodeOptions } from "@sentry/node";

type DataCollection = NonNullable<NodeOptions["dataCollection"]>;

const deniedKeys = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * Data collection matching the `@sentry/node@10` defaults, i.e. what used to be `sendDefaultPii:
 * false`. Since v11, leaving `dataCollection` unset collects personally identifiable information
 * (user info, cookies, headers, request and response bodies) by default.
 *
 * @see {@link https://docs.sentry.io/platforms/javascript/guides/node/migration/v10-to-v11/}
 */
const restrictedDataCollection: DataCollection = {
	userInfo: false,
	cookies: false,
	httpHeaders: {
		request: { deny: deniedKeys },
		response: { deny: deniedKeys },
	},
	httpBodies: [],
	urlQueryParams: { deny: deniedKeys },
	genAI: { inputs: false, outputs: false },
	databaseQueryData: false,
	queues: false,
	graphQL: { document: false, variables: false },
};

export function getDataCollection(
	dataCollection: "disabled" | "enabled",
): DataCollection | undefined {
	return dataCollection === "enabled" ? undefined : restrictedDataCollection;
}
