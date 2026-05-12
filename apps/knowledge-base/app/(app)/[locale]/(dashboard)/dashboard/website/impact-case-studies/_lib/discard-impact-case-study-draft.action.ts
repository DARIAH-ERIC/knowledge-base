"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { impactCaseStudiesLifecycleAdapter } from "@/lib/data/impact-case-studies.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardImpactCaseStudyDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, impactCaseStudiesLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/impact-case-studies", locale });
}
