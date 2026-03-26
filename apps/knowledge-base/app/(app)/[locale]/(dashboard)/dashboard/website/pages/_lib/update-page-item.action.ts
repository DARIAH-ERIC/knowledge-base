"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdatePageItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/update-page-item.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updatePageItemAction = createServerAction(
	async function updatePageItemAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdatePageItemActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdatePageItemActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, id, imageKey, summary } = result.output;

		await db.transaction(async (tx) => {
			let imageId: string | null = null;

			if (imageKey != null) {
				const asset = await tx.query.assets.findFirst({
					where: { key: imageKey },
					columns: { id: true },
				});

				assert(asset);

				imageId = asset.id;
			}

			await tx
				.update(schema.pages)
				.set({ imageId: imageId ?? undefined, title, summary })
				.where(eq(schema.pages.id, id));

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
				type: schema.ContentBlockTypes["type"],
				content: object,
				blockId: string,
				isNew: boolean,
			) {
				// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
				switch (type) {
					case "rich_text": {
						if (isNew) {
							await tx.insert(schema.richTextContentBlocks).values({ id: blockId, content });
						} else {
							await tx
								.update(schema.richTextContentBlocks)
								.set({ content })
								.where(eq(schema.richTextContentBlocks.id, blockId));
						}
					}
				}
			}

			if (contentField != null) {
				await Promise.all(
					contentBlocks.map(async (contentBlock, index) => {
						const { id, type, content, position } = contentBlock;

						if (position !== undefined) {
							await tx
								.update(schema.contentBlocks)
								.set({
									fieldId: contentField.id,
									typeId: contentBlockTypesByType[type].id,
									position: index,
								})
								.where(eq(schema.contentBlocks.id, id));

							await upsertTypeBlock(tx, type, content, id, false);
						} else {
							const [added] = await tx
								.insert(schema.contentBlocks)
								.values({
									fieldId: contentField.id,
									typeId: contentBlockTypesByType[type].id,
									position: index,
								})
								.returning({ id: schema.contentBlocks.id });

							assert(added);

							await upsertTypeBlock(tx, type, content, added.id, true);
						}
					}),
				);
			}
		});

		revalidatePath("/[locale]/dashboard/website/pages", "layout");

		redirect({ href: "/dashboard/website/pages", locale });
	},
);
