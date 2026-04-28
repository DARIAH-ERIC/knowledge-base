"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

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

	revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");
}
