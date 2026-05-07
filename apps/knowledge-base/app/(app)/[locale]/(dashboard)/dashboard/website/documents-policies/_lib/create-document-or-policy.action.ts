"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateDocumentOrPolicyActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy.schema";
import { assertAdmin } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { createPublishedDocument } from "@/lib/data/entity-lifecycle";
import { db, type Transaction } from "@/lib/db";
import { eq, isNull } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createDocumentOrPolicyAction = createServerAction(
	async function createDocumentOrPolicyAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateDocumentOrPolicyActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateDocumentOrPolicyActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, documentKey, summary, url, groupId } = result.output;

		const slug = slugify(title);
		let entityDocumentId: string | null = null;

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: {
					type: "documents_policies",
				},
				columns: {
					id: true,
				},
			});

			assert(type);

			const { documentId, versionId } = await createPublishedDocument(tx, type.id, slug);
			entityDocumentId = documentId;

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
				id: versionId,
				documentId: asset.id,
				title,
				summary,
				url: url != null && url.length > 0 ? url : null,
				groupId: groupId ?? null,
				position: siblings.length,
			});

			const contentFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: type.id,
					fieldName: "content",
				},
				columns: { id: true },
			});

			assert(contentFieldName);

			const [contentField] = await tx
				.insert(schema.fields)
				.values({ entityVersionId: versionId, fieldNameId: contentFieldName.id })
				.returning({ id: schema.fields.id });

			assert(contentField);

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
				return item.type;
			});

			async function insertTypeBlock(tx: Transaction, block: ContentBlockInput, blockId: string) {
				await upsertTypedContentBlock(tx, block, blockId, true);
			}

			await Promise.all(
				contentBlocks.map(async (contentBlock, index) => {
					const [added] = await tx
						.insert(schema.contentBlocks)
						.values({
							fieldId: contentField.id,
							typeId: contentBlockTypesByType[contentBlock.type].id,
							position: index,
						})
						.returning({ id: schema.contentBlocks.id });

					assert(added);

					await insertTypeBlock(tx, contentBlock, added.id);
				}),
			);
		});

		after(async () => {
			if (entityDocumentId != null) {
				await syncWebsiteDocumentForEntity(entityDocumentId);
			}

			await dispatchWebhook({ type: "documents-policies" });
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		redirect({ href: "/dashboard/website/documents-policies", locale });
	},
);
