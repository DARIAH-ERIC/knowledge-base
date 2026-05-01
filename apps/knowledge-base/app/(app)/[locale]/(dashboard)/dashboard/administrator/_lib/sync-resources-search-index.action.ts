"use server";

import { createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted } from "next-intl/server";

import { syncResourcesSearchIndex } from "@/lib/admin-tasks/sync-resources-search-index";
import { assertAdmin } from "@/lib/auth/session";
import { createServerAction } from "@/lib/server/create-server-action";

export const syncResourcesSearchIndexAction = createServerAction(
	async function syncResourcesSearchIndexAction() {
		const t = await getExtracted();

		await assertAdmin();

		const result = await syncResourcesSearchIndex();

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({
			message:
				result.failedCount === 0
					? t(
							"Re-synced {count} resources search documents and {websiteCount} website search documents.",
							{
								count: String(result.count),
								websiteCount: String(result.websiteCount),
							},
						)
					: t(
							"Re-synced {count} resources search documents and {websiteCount} website search documents with {failedCount} stale deletion failures.",
							{
								count: String(result.count),
								websiteCount: String(result.websiteCount),
								failedCount: String(result.failedCount),
							},
						),
		});
	},
);
