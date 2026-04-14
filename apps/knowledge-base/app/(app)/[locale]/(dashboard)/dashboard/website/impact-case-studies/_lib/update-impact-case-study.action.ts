"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { eq, inArray } from "@dariah-eric/database";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateImpactCaseStudyActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/update-impact-case-study.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateImpactCaseStudyAction = createServerAction(
	async function updateImpactCaseStudyAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateImpactCaseStudyActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateImpactCaseStudyActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, id, imageKey, summary } = result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			const imageId = asset.id;

			await tx
				.update(schema.impactCaseStudies)
				.set({ imageId, title, summary })
				.where(eq(schema.impactCaseStudies.id, id));

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
				switch (block.type) {
					case "rich_text": {
						if (isNew) {
							await tx
								.insert(schema.richTextContentBlocks)
								.values({ id: blockId, content: block.content ?? {} });
						} else {
							await tx
								.update(schema.richTextContentBlocks)
								.set({ content: block.content ?? {} })
								.where(eq(schema.richTextContentBlocks.id, blockId));
						}
						break;
					}
					case "image": {
						const imageKey = block.content?.imageKey;
						if (imageKey == null) break;
						const asset = await tx.query.assets.findFirst({
							where: { key: imageKey },
							columns: { id: true },
						});
						if (asset == null) break;
						const caption = block.content?.caption ?? null;
						if (isNew) {
							await tx
								.insert(schema.imageContentBlocks)
								.values({ id: blockId, imageId: asset.id, caption });
						} else {
							await tx
								.update(schema.imageContentBlocks)
								.set({ imageId: asset.id, caption })
								.where(eq(schema.imageContentBlocks.id, blockId));
						}
						break;
					}
					case "embed": {
						const url = block.content?.url;
						const title = block.content?.title;
						if (url == null || title == null) break;
						const caption = block.content?.caption ?? null;
						if (isNew) {
							await tx
								.insert(schema.embedContentBlocks)
								.values({ id: blockId, url, title, caption });
						} else {
							await tx
								.update(schema.embedContentBlocks)
								.set({ url, title, caption })
								.where(eq(schema.embedContentBlocks.id, blockId));
						}
						break;
					}
					case "data": {
						const dataType = block.content?.dataType;
						if (dataType == null) break;
						const dataContentBlockType = await tx.query.dataContentBlockTypes.findFirst({
							where: { type: dataType },
							columns: { id: true },
						});
						if (dataContentBlockType == null) break;
						const limit = block.content?.limit ?? null;
						const selectedIds = block.content?.selectedIds ?? null;
						if (isNew) {
							await tx.insert(schema.dataContentBlocks).values({
								id: blockId,
								typeId: dataContentBlockType.id,
								limit,
								selectedIds,
							});
						} else {
							await tx
								.update(schema.dataContentBlocks)
								.set({ typeId: dataContentBlockType.id, limit, selectedIds })
								.where(eq(schema.dataContentBlocks.id, blockId));
						}
						break;
					}
					case "hero": {
						const heroTitle = block.content?.title;
						if (heroTitle == null) break;
						const heroImageKey = block.content?.imageKey;
						let heroImageId: string | null = null;
						if (heroImageKey != null) {
							const heroAsset = await tx.query.assets.findFirst({
								where: { key: heroImageKey },
								columns: { id: true },
							});
							heroImageId = heroAsset?.id ?? null;
						}
						const eyebrow = block.content?.eyebrow ?? null;
						const ctas = block.content?.ctas ?? null;
						if (isNew) {
							await tx.insert(schema.heroContentBlocks).values({
								id: blockId,
								title: heroTitle,
								eyebrow,
								imageId: heroImageId,
								ctas,
							});
						} else {
							await tx
								.update(schema.heroContentBlocks)
								.set({ title: heroTitle, eyebrow, imageId: heroImageId, ctas })
								.where(eq(schema.heroContentBlocks.id, blockId));
						}
						break;
					}
					case "accordion": {
						const items = block.content?.items ?? [];
						if (isNew) {
							await tx.insert(schema.accordionContentBlocks).values({ id: blockId, items });
						} else {
							await tx
								.update(schema.accordionContentBlocks)
								.set({ items })
								.where(eq(schema.accordionContentBlocks.id, blockId));
						}
						break;
					}
				}
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
		});

		revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");

		redirect({ href: "/dashboard/website/impact-case-studies", locale });
	},
);
