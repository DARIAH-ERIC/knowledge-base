"use server";

import { createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { syncWebsiteSearchIndex } from "@/lib/admin-tasks/sync-website-search-index";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createServerAction } from "@/lib/server/create-server-action";

export const syncWebsiteSearchIndexAction = createServerAction(
	async function syncWebsiteSearchIndexAction() {
		const t = await getExtracted();

		const auditSession = await assertAdmin();

		const result = await syncWebsiteSearchIndex();

		await recordAuditEvent(db, {
			actorUserId: auditSession?.user.id,
			action: "sync",
			subjectType: "website_search_index",
			subjectId: "all",
			summary: { count: result.count, failedCount: result.failedCount },
		});

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({
			message:
				result.failedCount === 0
					? t("Re-synced {count} website search documents.", {
							count: String(result.count),
						})
					: t("Re-synced {count} website search documents with {failedCount} failures.", {
							count: String(result.count),
							failedCount: String(result.failedCount),
						}),
		});
	},
);
