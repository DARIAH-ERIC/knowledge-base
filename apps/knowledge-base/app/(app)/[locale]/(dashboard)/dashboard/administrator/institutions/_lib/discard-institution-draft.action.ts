"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardInstitutionDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/administrator/institutions", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/institutions", locale });
}
