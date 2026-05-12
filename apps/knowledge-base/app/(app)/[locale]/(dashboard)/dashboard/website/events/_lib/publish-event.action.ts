"use server";

import { assert } from "@acdh-oeaw/lib";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { eventsLifecycleAdapter } from "@/lib/data/events.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishEventAction(documentId: string): Promise<void> {
	await assertAdmin();

	assert(documentId, "Missing documentId.");

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, eventsLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "events" });
	});

	revalidatePath("/[locale]/dashboard/website/events", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/events", locale });
}
