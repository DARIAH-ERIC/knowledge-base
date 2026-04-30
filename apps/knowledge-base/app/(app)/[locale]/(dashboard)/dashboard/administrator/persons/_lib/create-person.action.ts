"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/create-person.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createPersonAction = createServerAction(
	async function createPersonAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreatePersonActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreatePersonActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { biography, email, imageKey, name, orcid, position, sortName } = result.output;

		const slug = slugify(name);

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: {
					type: "persons",
				},
				columns: {
					id: true,
				},
			});

			assert(type);

			const status = await tx.query.entityStatus.findFirst({
				where: {
					type: "published",
				},
				columns: {
					id: true,
				},
			});

			assert(status);

			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug,
					statusId: status.id,
					typeId: type.id,
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			await tx.insert(schema.persons).values({
				id: entity.id,
				email,
				imageId: asset.id,
				name,
				orcid,
				position,
				sortName,
			});

			const biographyFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: type.id,
					fieldName: "biography",
				},
				columns: { id: true },
			});

			assert(biographyFieldName);

			const [biographyField] = await tx
				.insert(schema.fields)
				.values({ entityId: entity.id, fieldNameId: biographyFieldName.id })
				.returning({ id: schema.fields.id });

			assert(biographyField);

			const richTextType = await tx.query.contentBlockTypes.findFirst({
				where: { type: "rich_text" },
				columns: { id: true },
			});

			assert(richTextType);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({ fieldId: biographyField.id, typeId: richTextType.id, position: 0 })
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				id: contentBlock.id,
				content: JSON.parse(biography) as schema.RichTextContentBlock["content"],
			});
		});

		revalidatePath("/[locale]/dashboard/administrator/persons", "layout");

		redirect({ href: "/dashboard/administrator/persons", locale });
	},
);
