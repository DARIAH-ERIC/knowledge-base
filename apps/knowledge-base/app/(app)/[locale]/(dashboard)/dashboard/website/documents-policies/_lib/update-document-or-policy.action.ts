"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { type ValidationErrors, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateDocumentOrPolicyActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy.schema";
import { assertAdmin } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { ensureDraftVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { type Transaction, db } from "@/lib/db";
import { eq, inArray, isNull } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateDocumentOrPolicyAction = createServerAction(
	async function updateDocumentOrPolicyAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

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

		const { contentBlocks, documentId, documentKey, title, summary, url, groupId } = result.output;

		await db.transaction(async (tx) => {
			const draftVersionId = await ensureDraftVersion(
				tx,
				documentId,
				documentsPoliciesLifecycleAdapter,
			);

			const asset = await tx.query.assets.findFirst({
				where: { key: documentKey },
				columns: { id: true },
			});

			assert(asset);

			const assetId = asset.id;

			const current = await tx.query.documentsPolicies.findFirst({
				where: { id: draftVersionId },
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
					documentId: assetId,
					title,
					summary,
					url: url != null && url.length > 0 ? url : null,
					groupId: newGroupId,
					...(newPosition !== undefined ? { position: newPosition } : {}),
				})
				.where(eq(schema.documentsPolicies.id, draftVersionId));

			const contentField = await tx.query.fields.findFirst({
				where: {
					entityVersionId: draftVersionId,
					name: { fieldName: "content" },
				},
				columns: { id: true },
			});

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => item.type);

			async function upsertTypeBlock(tx: Transaction, block: ContentBlockInput, blockId: string) {
				await upsertTypedContentBlock(tx, block, blockId, true);
			}

			if (contentField != null) {
				const existingBlocks = await tx.query.contentBlocks.findMany({
					where: { fieldId: contentField.id },
					columns: { id: true },
				});

				if (existingBlocks.length > 0) {
					await tx.delete(schema.contentBlocks).where(
						inArray(
							schema.contentBlocks.id,
							existingBlocks.map((b) => b.id),
						),
					);
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

						await upsertTypeBlock(tx, contentBlock, added.id);
					}),
				);
			}

			await touchVersion(tx, draftVersionId);
		});

		after(async () => {
			await syncWebsiteDocumentForEntity(documentId);
			await dispatchWebhook({ type: "documents-policies" });
		});

		revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

		redirect({ href: "/dashboard/website/documents-policies", locale });
	},
);
