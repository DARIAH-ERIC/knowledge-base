"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateWorkingGroupActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.schema";
import { assertAdmin } from "@/lib/auth/session";
import { ensureDraftVersion, publishVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { syncEntityRelations } from "@/lib/data/relations";
import { db } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateWorkingGroupAction = createServerAction(
	async function updateWorkingGroupAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateWorkingGroupActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateWorkingGroupActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const {
			acronym,
			description,
			documentId,
			imageKey,
			name,
			relatedEntityIds,
			relatedResourceIds,
			socialMediaIds,
			summary,
		} = result.output;

		await db.transaction(async (tx) => {
			const draftVersionId = await ensureDraftVersion(
				tx,
				documentId,
				organisationalUnitsLifecycleAdapter,
			);

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
				.update(schema.organisationalUnits)
				.set({ acronym, imageId, name, summary })
				.where(eq(schema.organisationalUnits.id, draftVersionId));

			const descriptionField = await tx.query.fields.findFirst({
				where: {
					entityVersionId: draftVersionId,
					name: { fieldName: "description" },
				},
				columns: { id: true },
			});

			const parsedContent = JSON.parse(description) as schema.RichTextContentBlock["content"];

			if (descriptionField != null) {
				const existingContentBlock = await tx.query.contentBlocks.findFirst({
					where: {
						fieldId: descriptionField.id,
						type: { type: "rich_text" },
					},
					columns: { id: true },
				});

				if (existingContentBlock != null) {
					await tx
						.update(schema.richTextContentBlocks)
						.set({ content: parsedContent })
						.where(eq(schema.richTextContentBlocks.id, existingContentBlock.id));
				} else {
					const richTextType = await tx.query.contentBlockTypes.findFirst({
						where: { type: "rich_text" },
						columns: { id: true },
					});

					assert(richTextType);

					const [newContentBlock] = await tx
						.insert(schema.contentBlocks)
						.values({ fieldId: descriptionField.id, typeId: richTextType.id, position: 0 })
						.returning({ id: schema.contentBlocks.id });

					assert(newContentBlock);

					await tx.insert(schema.richTextContentBlocks).values({
						id: newContentBlock.id,
						content: parsedContent,
					});
				}
			}

			const existingSocialMedia = await tx.query.organisationalUnitsToSocialMedia.findMany({
				where: { organisationalUnitId: draftVersionId },
				columns: { id: true, socialMediaId: true },
			});
			const existingSocialMediaIds = new Set(existingSocialMedia.map((row) => row.socialMediaId));
			const submittedSocialMediaIds = new Set(socialMediaIds);
			const socialMediaToDelete = existingSocialMedia
				.filter((row) => !submittedSocialMediaIds.has(row.socialMediaId))
				.map((row) => row.id);

			if (socialMediaToDelete.length > 0) {
				await tx
					.delete(schema.organisationalUnitsToSocialMedia)
					.where(inArray(schema.organisationalUnitsToSocialMedia.id, socialMediaToDelete));
			}

			const socialMediaToInsert = socialMediaIds.filter(
				(socialMediaId) => !existingSocialMediaIds.has(socialMediaId),
			);

			if (socialMediaToInsert.length > 0) {
				await tx.insert(schema.organisationalUnitsToSocialMedia).values(
					socialMediaToInsert.map((socialMediaId) => {
						return { organisationalUnitId: draftVersionId, socialMediaId };
					}),
				);
			}

			await syncEntityRelations(tx, documentId, relatedEntityIds, relatedResourceIds);
			await touchVersion(tx, draftVersionId);

			if (shouldSaveAndPublish(formData)) {
				await publishVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
			}
		});

		after(async () => {
			await syncWebsiteDocumentForEntity(documentId);
			await dispatchWebhook({ type: "working-groups" });
		});

		revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

		redirect({ href: "/dashboard/administrator/working-groups", locale });
	},
);
