"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function deleteImpactCaseStudyContributorAction(
	articleId: string,
	personId: string,
): Promise<void> {
	await assertAuthenticated();

	await db
		.delete(schema.impactCaseStudiesToPersons)
		.where(
			and(
				eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, articleId),
				eq(schema.impactCaseStudiesToPersons.personId, personId),
			),
		);

	after(async () => {
		await dispatchWebhook({ type: "impact-case-studies" });
	});

	revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");
}
