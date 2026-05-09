"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardPersonDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, personsLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/administrator/persons", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/persons", locale });
}
