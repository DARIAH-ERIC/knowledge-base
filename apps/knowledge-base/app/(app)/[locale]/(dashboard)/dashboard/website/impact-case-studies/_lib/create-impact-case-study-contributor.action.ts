"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateImpactCaseStudyContributorActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/create-impact-case-study-contributor.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createImpactCaseStudyContributorAction = createServerAction(
	async function createImpactCaseStudyContributorAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateImpactCaseStudyContributorActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateImpactCaseStudyContributorActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { articleId, personId, role } = result.output;

		const existing = await db.query.impactCaseStudiesToPersons.findFirst({
			where: { impactCaseStudyId: articleId, personId },
			columns: { personId: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contributor already exists.") });
		}

		await db
			.insert(schema.impactCaseStudiesToPersons)
			.values({ impactCaseStudyId: articleId, personId, role });

		revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");

		return createActionStateSuccess({ data: undefined });
	},
);
