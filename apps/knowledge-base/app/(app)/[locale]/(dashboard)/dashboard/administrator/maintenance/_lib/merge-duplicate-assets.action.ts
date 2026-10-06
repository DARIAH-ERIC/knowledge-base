"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import {
	type MergeDuplicateAssetsResult,
	mergeDuplicateAssets,
} from "@/lib/data/asset-deduplication";
import { db } from "@/lib/db";
import { inArray } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function mergeDuplicateAssetsAction(
	canonicalId: string,
	staleIds: Array<string>,
): Promise<MergeDuplicateAssetsResult> {
	await assertAdmin();
	const affectsSiteMetadata = await db
		.select({ id: schema.siteMetadata.id })
		.from(schema.siteMetadata)
		.where(inArray(schema.siteMetadata.ogImageId, staleIds))
		.limit(1)
		.then((rows) => rows.length > 0);
	const result = await mergeDuplicateAssets(canonicalId, staleIds);
	revalidatePath("/[locale]/dashboard/administrator/maintenance", "page");
	await dispatchWebhook({
		tags: ["assets", ...(affectsSiteMetadata ? (["site-metadata"] as const) : [])],
	});
	return result;
}
