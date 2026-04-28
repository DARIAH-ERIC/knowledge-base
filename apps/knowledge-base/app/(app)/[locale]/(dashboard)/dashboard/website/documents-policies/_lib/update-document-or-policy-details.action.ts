"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateDocumentOrPolicyDetailsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy-details.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, isNull } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateDocumentOrPolicyDetailsAction = createServerAction(
	async function updateDocumentOrPolicyDetailsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateDocumentOrPolicyDetailsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateDocumentOrPolicyDetailsActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, title, summary, url, groupId, documentKey } = result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: documentKey },
				columns: { id: true },
			});

			assert(asset);

			const current = await tx.query.documentsPolicies.findFirst({
				where: { id },
				columns: { groupId: true },
			});

			const newGroupId = groupId ?? null;
			let newPosition: number | undefined;

			if (current != null && current.groupId !== newGroupId) {
				const siblings = await tx
					.select({ id: schema.documentsPolicies.id })
					.from(schema.documentsPolicies)
					.where(
						newGroupId != null
							? eq(schema.documentsPolicies.groupId, newGroupId)
							: isNull(schema.documentsPolicies.groupId),
					);

				newPosition = siblings.length;
			}

			await tx
				.update(schema.documentsPolicies)
				.set({
					title,
					summary,
					url: url != null && url.length > 0 ? url : null,
					groupId: newGroupId,
					documentId: asset.id,
					...(newPosition !== undefined ? { position: newPosition } : {}),
				})
				.where(eq(schema.documentsPolicies.id, id));
		});

		after(async () => {
			await syncWebsiteDocumentForEntity(id);
			await dispatchWebhook({ type: "documents-policies" });
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		return createActionStateSuccess({});
	},
);
