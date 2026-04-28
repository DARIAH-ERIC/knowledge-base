"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateSpotlightArticleContributorActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/create-spotlight-article-contributor.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createSpotlightArticleContributorAction = createServerAction(
	async function createSpotlightArticleContributorAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateSpotlightArticleContributorActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateSpotlightArticleContributorActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { articleId, personId, role } = result.output;

		const existing = await db.query.spotlightArticlesToPersons.findFirst({
			where: { spotlightArticleId: articleId, personId },
			columns: { personId: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contributor already exists.") });
		}

		await db
			.insert(schema.spotlightArticlesToPersons)
			.values({ spotlightArticleId: articleId, personId, role });

		revalidatePath("/[locale]/dashboard/website/spotlight-articles", "layout");

		return createActionStateSuccess({ data: undefined });
	},
);
