"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import { eq, inArray, isNull } from "@dariah-eric/database/sql";
import { db, type Transaction } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateDocumentOrPolicyActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateDocumentOrPolicyAction = createServerAction(
	async function updateDocumentOrPolicyAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateDocumentOrPolicyActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateDocumentOrPolicyActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { contentBlocks, title, id, documentKey, summary, url, groupId } = result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: documentKey },
				columns: { id: true },
			});

			assert(asset);

			const documentId = asset.id;

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
					documentId,
					title,
					summary,
					url: url != null && url.length > 0 ? url : null,
					groupId: newGroupId,
					...(newPosition !== undefined ? { position: newPosition } : {}),
				})
				.where(eq(schema.documentsPolicies.id, id));

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
		});

		after(async () => {
			await dispatchWebhook({ type: "documents-policies" });
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		redirect({ href: "/dashboard/website/documents-policies", locale });
	},
);
