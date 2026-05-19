"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { CreateEventActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/create-event.schema";
import { assertAdmin } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { createDraftDocument, publishVersion } from "@/lib/data/entity-lifecycle";
import { eventsLifecycleAdapter } from "@/lib/data/events.lifecycle-adapter";
import { type Transaction, db } from "@/lib/db";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createEventAction = createServerAction(
	async function createEventAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateEventActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateEventActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const {
			contentBlocks,
			duration,
			location,
			title,
			imageKey,
			summary,
			website,
			relatedEntityIds,
			relatedResourceIds,
		} = result.output;

		const slug = slugify(title);
		let documentId: string | null = null;

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

			const { documentId: docId, versionId } = await createDraftDocument(tx, type.id, slug);
			documentId = docId;

			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			await tx.insert(schema.events).values({
				id: versionId,
				duration,
				location,
				imageId: asset.id,
				title,
				summary,
				website,
			});

			if (relatedEntityIds.length > 0) {
				await tx.insert(schema.entitiesToEntities).values(
					relatedEntityIds.map((relatedEntityId) => {
						return { entityId: docId, relatedEntityId };
					}),
				);
			}

			if (relatedResourceIds.length > 0) {
				await tx.insert(schema.entitiesToResources).values(
					relatedResourceIds.map((resourceId) => {
						return { entityId: docId, resourceId };
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
				.values({ entityVersionId: versionId, fieldNameId: contentFieldName.id })
				.returning({ id: schema.fields.id });

			assert(contentField);

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => item.type);

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

			if (shouldSaveAndPublish(formData)) {
				await publishVersion(tx, docId, eventsLifecycleAdapter);
			}
		});

		after(async () => {
			if (documentId != null) {
				await syncWebsiteDocumentForEntity(documentId);
			}

			await dispatchWebhook({ type: "events" });
		});

		revalidatePath("/[locale]/dashboard/website/events", "layout");

		redirect({ href: "/dashboard/website/events", locale });
	},
);
