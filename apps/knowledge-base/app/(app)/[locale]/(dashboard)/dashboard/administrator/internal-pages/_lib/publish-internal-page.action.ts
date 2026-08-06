"use server";

import { internalPagesRevalidatePaths } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_lib/revalidate-paths";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { internalPagesLifecycleAdapter } from "@/lib/data/internal-pages.lifecycle-adapter";
import { createCommandAction } from "@/lib/server/create-command-action";

export const publishInternalPageAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "publish", subjectType: "internal_pages" },
	revalidate: internalPagesRevalidatePaths,
	redirect: "/dashboard/administrator/internal-pages",

	async mutate(tx, [documentId]: [string]) {
		await publishVersion(tx, documentId, internalPagesLifecycleAdapter);
		return { subjectId: documentId };
	},
});
