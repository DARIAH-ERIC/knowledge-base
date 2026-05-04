"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateWorkingGroupActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group.schema";
import { assertAdmin } from "@/lib/auth/session";
import { createPublishedDocument } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";

export const createWorkingGroupAction = createServerAction(
	async function createWorkingGroupAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateWorkingGroupActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { acronym, description, imageKey, name, relatedEntityIds, relatedResourceIds, summary } =
			result.output;

		const slug = slugify(name);
		let documentId: string | null = null;

		await db.transaction(async (tx) => {
			const entityType = await tx.query.entityTypes.findFirst({
				where: { type: "organisational_units" },
				columns: { id: true },
			});

			assert(entityType);

			const orgUnitType = await tx.query.organisationalUnitTypes.findFirst({
				where: { type: "working_group" },
				columns: { id: true },
			});

			assert(orgUnitType);

			const umbrellaUnit = await tx.query.organisationalUnits.findFirst({
				where: {
					type: {
						type: "eric",
					},
				},
				columns: { id: true },
			});

			assert(umbrellaUnit);

			const unitStatus = await tx.query.organisationalUnitStatus.findFirst({
				where: { status: "is_part_of" },
				columns: { id: true },
			});

			assert(unitStatus);

			const { documentId: docId, versionId } = await createPublishedDocument(
				tx,
				entityType.id,
				slug,
			);
			documentId = docId;

			let imageId: string | null = null;

			if (imageKey != null) {
				const asset = await tx.query.assets.findFirst({
					where: { key: imageKey },
					columns: { id: true },
				});

				assert(asset);

				imageId = asset.id;
			}

			await tx.insert(schema.organisationalUnits).values({
				id: versionId,
				acronym,
				imageId,
				name,
				summary,
				typeId: orgUnitType.id,
			});

			await tx.insert(schema.organisationalUnitsRelations).values({
				unitId: versionId,
				relatedUnitId: umbrellaUnit.id,
				duration: { start: new Date() },
				status: unitStatus.id,
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

			const descriptionFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: { entityTypeId: entityType.id, fieldName: "description" },
				columns: { id: true },
			});

			assert(descriptionFieldName);

			const [descriptionField] = await tx
				.insert(schema.fields)
				.values({ entityVersionId: versionId, fieldNameId: descriptionFieldName.id })
				.returning({ id: schema.fields.id });

			assert(descriptionField);

			const richTextType = await tx.query.contentBlockTypes.findFirst({
				where: { type: "rich_text" },
				columns: { id: true },
			});

			assert(richTextType);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({ fieldId: descriptionField.id, typeId: richTextType.id, position: 0 })
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				id: contentBlock.id,
				content: JSON.parse(description) as schema.RichTextContentBlock["content"],
			});
		});

		after(async () => {
			if (documentId != null) {
				await syncWebsiteDocumentForEntity(documentId);
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

		redirect({ href: "/dashboard/administrator/working-groups", locale });
	},
);
