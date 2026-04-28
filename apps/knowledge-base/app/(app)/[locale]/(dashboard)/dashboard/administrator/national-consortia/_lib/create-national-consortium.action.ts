"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateNationalConsortiumActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/create-national-consortium.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createNationalConsortiumAction = createServerAction(
	async function createNationalConsortiumAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateNationalConsortiumActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateNationalConsortiumActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { acronym, description, imageKey, name, relatedEntityIds, relatedResourceIds, summary } =
			result.output;

		const slug = slugify(name);

		await db.transaction(async (tx) => {
			const entityType = await tx.query.entityTypes.findFirst({
				where: { type: "organisational_units" },
				columns: { id: true },
			});

			assert(entityType);

			const orgUnitType = await tx.query.organisationalUnitTypes.findFirst({
				where: { type: "national_consortium" },
				columns: { id: true },
			});

			assert(orgUnitType);

			const entityStatus = await tx.query.entityStatus.findFirst({
				where: { type: "draft" },
				columns: { id: true },
			});

			assert(entityStatus);

			const [entity] = await tx
				.insert(schema.entities)
				.values({ slug, statusId: entityStatus.id, typeId: entityType.id })
				.returning({ id: schema.entities.id });

			assert(entity);

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
				id: entity.id,
				acronym,
				imageId,
				name,
				summary,
				typeId: orgUnitType.id,
			});

			if (relatedEntityIds.length > 0) {
				await tx.insert(schema.entitiesToEntities).values(
					relatedEntityIds.map((relatedEntityId) => {
						return { entityId: entity.id, relatedEntityId };
					}),
				);
			}

			if (relatedResourceIds.length > 0) {
				await tx.insert(schema.entitiesToResources).values(
					relatedResourceIds.map((resourceId) => {
						return { entityId: entity.id, resourceId };
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
				.values({ entityId: entity.id, fieldNameId: descriptionFieldName.id })
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

		revalidatePath("/[locale]/dashboard/administrator/national-consortia", "layout");

		redirect({ href: "/dashboard/administrator/national-consortia", locale });
	},
);
