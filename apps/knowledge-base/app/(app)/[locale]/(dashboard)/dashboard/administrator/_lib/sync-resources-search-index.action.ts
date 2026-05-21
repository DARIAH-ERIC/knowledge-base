"use server";

import { createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { syncResourcesSearchIndex } from "@/lib/admin-tasks/sync-resources-search-index";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createServerAction } from "@/lib/server/create-server-action";

export const syncResourcesSearchIndexAction = createServerAction(
	async function syncResourcesSearchIndexAction() {
		const t = await getExtracted();

		const auditSession = await assertAdmin();

		const result = await syncResourcesSearchIndex();

		await recordAuditEvent(db, {
			actorUserId: auditSession?.user.id,
			action: "sync",
			subjectType: "resources_search_index",
			subjectId: "all",
			summary: {
				count: result.count,
				failedCount: result.failedCount,
				websiteCount: result.websiteCount,
			},
		});

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
