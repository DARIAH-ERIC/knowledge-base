"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";

export async function publishPersonAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, personsLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
	});

	revalidatePath("/[locale]/dashboard/administrator/persons", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/persons", locale });
}
