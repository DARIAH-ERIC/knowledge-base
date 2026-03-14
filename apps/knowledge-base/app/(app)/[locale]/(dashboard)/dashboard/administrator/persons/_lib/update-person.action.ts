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

import { UpdatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updatePersonAction = createServerAction(
	async function updatePersonAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdatePersonActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdatePersonActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { biography, email, id, imageKey, name, orcid, sortName } = result.output;

		await db.transaction(async (tx) => {
			const asset = await tx.query.assets.findFirst({
				where: { key: imageKey },
				columns: { id: true },
			});

			assert(asset);

			const imageId = asset.id;

			await tx
				.update(schema.persons)
				.set({ email, imageId, name, orcid, sortName })
				.where(eq(schema.persons.id, id));

			const biographyField = await tx.query.fields.findFirst({
				where: {
					entityId: id,
					name: { fieldName: "biography" },
				},
				columns: { id: true },
			});

			const parsedContent = JSON.parse(biography) as schema.RichTextContentBlock["content"];

			if (biographyField != null) {
				const existingContentBlock = await tx.query.contentBlocks.findFirst({
					where: {
						fieldId: biographyField.id,
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
						.values({ fieldId: biographyField.id, typeId: richTextType.id, position: 0 })
						.returning({ id: schema.contentBlocks.id });

					assert(newContentBlock);

					await tx.insert(schema.richTextContentBlocks).values({
						id: newContentBlock.id,
						content: parsedContent,
					});
				}
			}
		});

		revalidatePath("/dashboard/administrator/persons", "layout");

		redirect({ href: "/dashboard/administrator/persons", locale });
	},
);
