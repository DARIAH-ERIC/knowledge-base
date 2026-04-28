"use server";

import { createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted } from "next-intl/server";

import { ingestSshocServices } from "@/lib/admin-tasks/ingest-sshoc-services";
import { assertAdmin } from "@/lib/auth/session";
import { createServerAction } from "@/lib/server/create-server-action";

export const ingestSshocServicesAction = createServerAction(
	async function ingestSshocServicesAction() {
		const t = await getExtracted();

		await assertAdmin();

		const result = await ingestSshocServices();

		revalidatePath("/[locale]/dashboard/administrator", "layout");
		revalidatePath("/[locale]/dashboard/administrator/services", "layout");

		return createActionStateSuccess({
			message: t(
				"Ingested {fetchedCount} SSHOC services. Created {createdCount}, updated {updatedCount}, marked {markedNeedsReviewCount} for review.",
				{
					createdCount: String(result.createdCount),
					fetchedCount: String(result.fetchedCount),
					markedNeedsReviewCount: String(result.markedNeedsReviewCount),
					updatedCount: String(result.updatedCount),
				},
			),
		});
	},
);
