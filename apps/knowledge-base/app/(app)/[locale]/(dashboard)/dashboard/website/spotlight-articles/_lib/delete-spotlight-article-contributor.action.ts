"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function deleteSpotlightArticleContributorAction(
	articleId: string,
	personId: string,
): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.spotlightArticlesToPersons)
			.where(
				and(
					eq(schema.spotlightArticlesToPersons.spotlightArticleId, articleId),
					eq(schema.spotlightArticlesToPersons.personId, personId),
				),
			);

		await touchVersion(tx, articleId);
	});

	after(async () => {
		await dispatchWebhook({ type: "spotlight-articles" });
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "delete",
		subjectType: "spotlight_articles",
		subjectId: articleId,
		summary: { personId },
	});

	revalidatePath("/[locale]/dashboard/website/spotlight-articles", "layout");
}
