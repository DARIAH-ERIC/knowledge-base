"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateEventActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/create-event.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createEventAction = createServerAction(
	async function createEventAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateEventActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateEventActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, duration, location, title, imageKey, summary, website } = result.output;

		const slug = slugify(title);

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: {
					type: "events",
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

			await tx.insert(schema.events).values({
				id: entity.id,
				duration,
				location,
				imageId: asset.id,
				title,
				summary,
				website,
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
				.values({ entityId: entity.id, fieldNameId: contentFieldName.id })
				.returning({ id: schema.fields.id });

			assert(contentField);

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
				return item.type;
			});

			async function insertTypeBlock(
				tx: Transaction,
				type: schema.ContentBlockTypes["type"],
				content: JSONContent | undefined,
				blockId: string,
			) {
				switch (type) {
					case "rich_text": {
						await tx
							.insert(schema.richTextContentBlocks)
							.values({ id: blockId, content: content ?? {} });
						break;
					}
					case "image": {
						const imageKey = content?.imageKey as string | undefined;
						if (imageKey == null) break;
						const asset = await tx.query.assets.findFirst({
							where: { key: imageKey },
							columns: { id: true },
						});
						if (asset == null) break;
						const caption = (content?.caption as string | undefined) ?? null;
						await tx
							.insert(schema.imageContentBlocks)
							.values({ id: blockId, imageId: asset.id, caption });
						break;
					}
					case "embed": {
						const url = content?.url as string | undefined;
						const title = content?.title as string | undefined;
						if (url == null || title == null) break;
						const caption = (content?.caption as string | undefined) ?? null;
						await tx.insert(schema.embedContentBlocks).values({ id: blockId, url, title, caption });
						break;
					}
					case "data": {
						const dataType = content?.dataType as "events" | "news" | undefined;
						if (dataType == null) break;
						const dataContentBlockType = await tx.query.dataContentBlockTypes.findFirst({
							where: { type: dataType },
							columns: { id: true },
						});
						if (dataContentBlockType == null) break;
						const limit = (content?.limit as number | undefined) ?? null;
						const selectedIds = (content?.selectedIds as Array<string> | undefined) ?? null;
						await tx.insert(schema.dataContentBlocks).values({
							id: blockId,
							typeId: dataContentBlockType.id,
							limit,
							selectedIds,
						});
						break;
					}
				}
			}

			await Promise.all(
				contentBlocks.map(async (contentBlock, index) => {
					const { type, content } = contentBlock;

					const [added] = await tx
						.insert(schema.contentBlocks)
						.values({
							fieldId: contentField.id,
							typeId: contentBlockTypesByType[type].id,
							position: index,
						})
						.returning({ id: schema.contentBlocks.id });

					assert(added);

					await insertTypeBlock(tx, type, content, added.id);
				}),
			);
		});

		revalidatePath("/[locale]/dashboard/website/events", "layout");

		redirect({ href: "/dashboard/website/events", locale });
	},
);
