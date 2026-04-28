"use server";

import { and, eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteSpotlightArticleContributorAction(
	articleId: string,
	personId: string,
): Promise<void> {
	await assertAuthenticated();

	await db
		.delete(schema.spotlightArticlesToPersons)
		.where(
			and(
				eq(schema.spotlightArticlesToPersons.spotlightArticleId, articleId),
				eq(schema.spotlightArticlesToPersons.personId, personId),
			),
		);

	revalidatePath("/[locale]/dashboard/website/spotlight-articles", "layout");
}
