"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq, isNull } from "@dariah-eric/database/sql";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateDocumentOrPolicyFromDialogActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy-from-dialog.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createDocumentOrPolicyFromDialogAction = createServerAction(
	async function createDocumentOrPolicyFromDialogAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateDocumentOrPolicyFromDialogActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateDocumentOrPolicyFromDialogActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { title, documentKey, summary, url, groupId } = result.output;

		const slug = slugify(title);
		let entityId: string | null = null;

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: { type: "documents_policies" },
				columns: { id: true },
			});

			assert(type);

			const status = await tx.query.entityStatus.findFirst({
				where: { type: "draft" },
				columns: { id: true },
			});

			assert(status);

			const [entity] = await tx
				.insert(schema.entities)
				.values({ slug, statusId: status.id, typeId: type.id })
				.returning({ id: schema.entities.id });

			assert(entity);
			entityId = entity.id;

			const asset = await tx.query.assets.findFirst({
				where: { key: documentKey },
				columns: { id: true },
			});

			assert(asset);

			const siblings = await tx
				.select({ id: schema.documentsPolicies.id })
				.from(schema.documentsPolicies)
				.where(
					groupId != null
						? eq(schema.documentsPolicies.groupId, groupId)
						: isNull(schema.documentsPolicies.groupId),
				);

			await tx.insert(schema.documentsPolicies).values({
				id: entity.id,
				documentId: asset.id,
				title,
				summary,
				url: url != null && url.length > 0 ? url : null,
				groupId: groupId ?? null,
				position: siblings.length,
			});

			const contentFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: { entityTypeId: type.id, fieldName: "content" },
				columns: { id: true },
			});

			assert(contentFieldName);

			await tx
				.insert(schema.fields)
				.values({ entityId: entity.id, fieldNameId: contentFieldName.id });
		});

		after(async () => {
			if (entityId != null) {
				await syncWebsiteDocumentForEntity(entityId);
			}

			await dispatchWebhook({ type: "documents-policies" });
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		return createActionStateSuccess({});
	},
);
