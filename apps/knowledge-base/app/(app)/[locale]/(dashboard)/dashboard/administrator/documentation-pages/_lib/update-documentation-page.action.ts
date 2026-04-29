"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateDocumentationPageActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/update-documentation-page.schema";
import { assertAdmin } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { db, type Transaction } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateDocumentationPageAction = createServerAction(
	async function updateDocumentationPageAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateDocumentationPageActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateDocumentationPageActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, id, title } = result.output;

		await db.transaction(async (tx) => {
			await tx
				.update(schema.documentationPages)
				.set({ title })
				.where(eq(schema.documentationPages.id, id));

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
					.filter((block) => {
						return !keptIds.has(block.id);
					})
					.map((block) => {
						return block.id;
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
		});

		revalidatePath("/[locale]/dashboard/website/documentation-pages", "layout");

		redirect({ href: "/dashboard/website/documentation-pages", locale });
	},
);
