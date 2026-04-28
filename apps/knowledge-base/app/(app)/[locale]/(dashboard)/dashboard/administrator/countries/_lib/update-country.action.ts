"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateCountryActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/update-country.schema";
import { assertAdmin } from "@/lib/auth/session";
import { syncEntityRelations } from "@/lib/data/relations";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateCountryAction = createServerAction(
	async function updateCountryAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateCountryActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateCountryActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const {
			acronym,
			description,
			id,
			imageKey,
			name,
			relatedEntityIds,
			relatedResourceIds,
			summary,
		} = result.output;

		await db.transaction(async (tx) => {
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
				.where(eq(schema.organisationalUnits.id, id));

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

			await syncEntityRelations(tx, id, relatedEntityIds, relatedResourceIds);
		});

		revalidatePath("/[locale]/dashboard/administrator/countries", "layout");

		redirect({ href: "/dashboard/administrator/countries", locale });
	},
);
