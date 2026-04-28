"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createProjectAction = createServerAction(
	async function createProjectAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateProjectActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateProjectActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const {
			acronym,
			call,
			description,
			duration,
			funding,
			imageKey,
			name,
			scopeId,
			summary,
			topic,
		} = result.output;

		const slug = slugify(name);

		await db.transaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: {
					type: "projects",
				},
				columns: {
					id: true,
				},
			});

			assert(type);

			const status = await tx.query.entityStatus.findFirst({
				where: {
					type: "draft",
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

			let imageId = null;

			if (imageKey != null) {
				const asset = await tx.query.assets.findFirst({
					where: { key: imageKey },
					columns: { id: true },
				});

				assert(asset);

				imageId = asset.id;
			}

			await tx.insert(schema.projects).values({
				id: entity.id,
				acronym,
				call,
				duration,
				funding,
				imageId,
				name,
				scopeId,
				summary,
				topic,
			});

			const descriptionFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: type.id,
					fieldName: "description",
				},
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

		revalidatePath("/[locale]/dashboard/administrator/projects", "layout");

		redirect({ href: "/dashboard/administrator/projects", locale });
	},
);
