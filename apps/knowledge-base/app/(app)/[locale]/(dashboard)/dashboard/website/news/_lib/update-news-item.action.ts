"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { eq, inArray } from "@dariah-eric/database/sql";
import { db, type Transaction } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateNewsItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { syncEntityRelations } from "@/lib/data/relations";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateNewsItemAction = createServerAction(
	async function updateNewsItemAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateNewsItemActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateNewsItemActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, id, imageKey, summary, relatedEntityIds, relatedResourceIds } =
			result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			const imageId = asset.id;

			await tx.update(schema.news).set({ imageId, title, summary }).where(eq(schema.news.id, id));

			const contentField = await tx.query.fields.findFirst({
				where: {
					entityId: id,
					name: { fieldName: "content" },
				},
				columns: { id: true },
			});

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
				return item.type;
			});

			async function upsertTypeBlock(
				tx: Transaction,
				block: ContentBlockInput,
				blockId: string,
				isNew: boolean,
			) {
				await upsertTypedContentBlock(tx, block, blockId, isNew);
			}

			if (contentField != null) {
				const keptIds = new Set(
					contentBlocks
						.filter((cb) => {
							return cb.position !== undefined;
						})
						.map((cb) => {
							return cb.id;
						}),
				);

				const existingBlocks = await tx.query.contentBlocks.findMany({
					where: { fieldId: contentField.id },
					columns: { id: true },
				});

				const toDelete = existingBlocks
					.filter((b) => {
						return !keptIds.has(b.id);
					})
					.map((b) => {
						return b.id;
					});

				if (toDelete.length > 0) {
					await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.id, toDelete));
				}

				await Promise.all(
					contentBlocks.map(async (contentBlock, index) => {
						const { id, position } = contentBlock;

						if (position !== undefined) {
							await tx
								.update(schema.contentBlocks)
								.set({
									fieldId: contentField.id,
									typeId: contentBlockTypesByType[contentBlock.type].id,
									position: index,
								})
								.where(eq(schema.contentBlocks.id, id));

							await upsertTypeBlock(tx, contentBlock, id, false);
						} else {
							const [added] = await tx
								.insert(schema.contentBlocks)
								.values({
									fieldId: contentField.id,
									typeId: contentBlockTypesByType[contentBlock.type].id,
									position: index,
								})
								.returning({ id: schema.contentBlocks.id });

							assert(added);

							await upsertTypeBlock(tx, contentBlock, added.id, true);
						}
					}),
				);
			}

			await syncEntityRelations(tx, id, relatedEntityIds, relatedResourceIds);
		});

		after(async () => {
			await dispatchWebhook({ type: "news" });
		});

		revalidatePath("/[locale]/dashboard/website/news", "layout");

		redirect({ href: "/dashboard/website/news", locale });
	},
);
