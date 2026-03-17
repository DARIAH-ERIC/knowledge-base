"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/update-project.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateProjectAction = createServerAction(
	async function updateProjectAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateProjectActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateProjectActionInputSchema>(result.issues);

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
			funders,
			funding,
			id,
			imageKey,
			name,
			scopeId,
			summary,
			topic,
		} = result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			const imageId = asset.id;

			await tx
				.update(schema.projects)
				.set({
					id,
					acronym,
					call,
					duration,
					funders,
					funding,
					imageId,
					name,
					scopeId,
					summary,
					topic,
				})
				.where(eq(schema.projects.id, id));

			const descriptionField = await tx.query.fields.findFirst({
				where: {
					entityId: id,
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
		});

		revalidatePath("/dashboard/administrator/projects", "layout");

		redirect({ href: "/dashboard/administrator/projects", locale });
	},
);
