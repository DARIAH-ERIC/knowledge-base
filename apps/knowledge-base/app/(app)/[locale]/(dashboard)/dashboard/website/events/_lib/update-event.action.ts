"use server";

import { assert, getFormDataValues, keyBy } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateEventActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/update-event.schema";
import { assertAdmin } from "@/lib/auth/session";
import type { ContentBlockInput } from "@/lib/content-block-input";
import { upsertTypedContentBlock } from "@/lib/content-blocks-service";
import { ensureDraftVersion, publishVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureEntityVersionField } from "@/lib/data/entity-version-fields";
import { eventsLifecycleAdapter } from "@/lib/data/events.lifecycle-adapter";
import { syncEntityRelations } from "@/lib/data/relations";
import { type Transaction, db } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateEventAction = createServerAction(
	async function updateEventAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateEventActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateEventActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const {
			contentBlocks,
			documentId,
			title,
			imageKey,
			isFullDay,
			summary,
			duration,
			location,
			website,
			relatedEntityIds,
			relatedResourceIds,
		} = result.output;

		await db.transaction(async (tx) => {
			const draftVersionId = await ensureDraftVersion(tx, documentId, eventsLifecycleAdapter);

			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			await tx
				.update(schema.events)
				.set({ imageId: asset.id, title, summary, location, website, duration, isFullDay })
				.where(eq(schema.events.id, draftVersionId));

			const contentField = await ensureEntityVersionField(tx, draftVersionId, "content");

			const contentBlockTypes = await db.query.contentBlockTypes.findMany();
			const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => item.type);

			async function upsertTypeBlock(tx: Transaction, block: ContentBlockInput, blockId: string) {
				await upsertTypedContentBlock(tx, block, blockId, true);
			}

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

			await syncEntityRelations(tx, documentId, relatedEntityIds, relatedResourceIds);
			await touchVersion(tx, draftVersionId);

			if (shouldSaveAndPublish(formData)) {
				await publishVersion(tx, documentId, eventsLifecycleAdapter);
			}
		});

		after(async () => {
			if (!shouldSaveAndPublish(formData)) {
				return;
			}

			await syncWebsiteDocumentForEntity(documentId);
			await dispatchWebhook({ type: "events" });
		});

		revalidatePath("/[locale]/dashboard/website/events", "layout");

		redirect({ href: "/dashboard/website/events", locale });
	},
);
