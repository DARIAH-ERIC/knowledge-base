"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { opportunitiesLifecycleAdapter } from "@/lib/data/opportunities.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardOpportunityDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, opportunitiesLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/website/opportunities", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/opportunities", locale });
}
