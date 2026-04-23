"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateNewsItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/create-news-item.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createNewsItemAction = createServerAction(
	async function createNewsItemAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateNewsItemActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateNewsItemActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, imageKey, summary, relatedEntityIds, relatedResourceIds } =
			result.output;

		const slug = slugify(title);

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: {
					type: "news",
				},
				columns: {
					id: true,
				},
			});

			assert(type);

			const status = await tx.query.entityStatus.findFirst({
				where: {
					type: "draft",
				},
				columns: {
					id: true,
				},
			});

			assert(status);

			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug,
					statusId: status.id,
					typeId: type.id,
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			await tx.insert(schema.news).values({
				id: entity.id,
				imageId: asset.id,
				title,
				summary,
			});

			if (relatedEntityIds.length > 0) {
				await tx.insert(schema.entitiesToEntities).values(
					relatedEntityIds.map((relatedEntityId) => {
						return { entityId: entity.id, relatedEntityId };
					}),
				);
			}

			if (relatedResourceIds.length > 0) {
				await tx.insert(schema.entitiesToResources).values(
					relatedResourceIds.map((resourceId) => {
						return { entityId: entity.id, resourceId };
					}),
				);
			}

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
				.values({ entityId: entity.id, fieldNameId: contentFieldName.id })
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
			await dispatchWebhook({ type: "news" });
		});

		revalidatePath("/[locale]/dashboard/website/news", "layout");

		redirect({ href: "/dashboard/website/news", locale });
	},
);
