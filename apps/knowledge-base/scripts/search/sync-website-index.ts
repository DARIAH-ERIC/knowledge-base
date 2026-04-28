import { parseArgs } from "node:util";

import { request } from "@dariah-eric/request";

import { env } from "@/config/env.config";
import { supportedWebsiteEntityTypes } from "@/lib/search/website-index";

type SyncRequestBody =
	| { entityId: string }
	| { entityIds: Array<string> }
	| { mode: "all" }
	| { mode: "type"; entityType: (typeof supportedWebsiteEntityTypes)[number] };

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		all: {
			type: "boolean",
		},
		entityId: {
			type: "string",
		},
		entityIds: {
			type: "string",
		},
		type: {
			type: "string",
		},
	},
});

function createRequestBody(): SyncRequestBody {
	if (values.all) {
		return { mode: "all" };
	}

	if (values.type != null) {
		if (
			!supportedWebsiteEntityTypes.includes(
				values.type as (typeof supportedWebsiteEntityTypes)[number],
			)
		) {
			throw new Error(
				`Invalid entity type "${values.type}". Expected one of: ${supportedWebsiteEntityTypes.join(", ")}.`,
			);
		}

		return {
			mode: "type",
			entityType: values.type as (typeof supportedWebsiteEntityTypes)[number],
		};
	}

	if (values.entityId != null) {
		return { entityId: values.entityId };
	}

	if (values.entityIds != null) {
		const entityIds = values.entityIds
			.split(",")
			.map((value) => {
				return value.trim();
			})
			.filter((value) => {
				return value.length > 0;
			});

		if (entityIds.length === 0) {
			throw new Error("Expected at least one entity id in --entityIds.");
		}

		return { entityIds };
	}

	throw new Error("Expected one of --all, --type, --entityId, or --entityIds.");
}

async function main(): Promise<void> {
	if (env.SEARCH_SYNC_API_SECRET == null) {
		throw new Error("Missing environment variable: SEARCH_SYNC_API_SECRET");
	}

	const body = createRequestBody();
	const url = new URL("/api/search/website/sync", env.NEXT_PUBLIC_APP_BASE_URL);

	const result = await request<{
		count: number;
		items: Array<unknown>;
		ok: boolean;
	}>(url, {
		method: "post",
		headers: {
			Authorization: `Bearer ${env.SEARCH_SYNC_API_SECRET}`,
		},
		body,
		responseType: "json",
	});

	if (result.isErr()) {
		throw result.error;
	}

	console.log(JSON.stringify(result.value.data, null, 2));
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
