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

import { CreateDocumentPolicyGroupActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-policy-group.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createDocumentPolicyGroupAction = createServerAction(
	async function createDocumentPolicyGroupAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateDocumentPolicyGroupActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateDocumentPolicyGroupActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { label } = result.output;

		const existing = await db.query.documentPolicyGroups.findMany({
			columns: { id: true },
		});

		await db.insert(schema.documentPolicyGroups).values({
			label,
			position: existing.length,
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		return createActionStateSuccess({});
	},
);
