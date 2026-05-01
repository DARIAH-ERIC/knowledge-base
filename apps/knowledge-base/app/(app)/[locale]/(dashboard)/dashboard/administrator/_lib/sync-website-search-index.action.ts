"use server";

import { createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted } from "next-intl/server";

import { syncWebsiteSearchIndex } from "@/lib/admin-tasks/sync-website-search-index";
import { assertAdmin } from "@/lib/auth/session";
import { createServerAction } from "@/lib/server/create-server-action";

export const syncWebsiteSearchIndexAction = createServerAction(
	async function syncWebsiteSearchIndexAction() {
		const t = await getExtracted();

		await assertAdmin();

		const result = await syncWebsiteSearchIndex();

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
