"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateSiteMetadataActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/metadata/_lib/update-site-metadata.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateSiteMetadataAction = createServerAction(
	async function updateSiteMetadataAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateSiteMetadataActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateSiteMetadataActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { title, description, ogTitle, ogDescription, imageKey } = result.output;

		await db.transaction(async (tx) => {
			let ogImageId: string | null = null;

			if (imageKey != null) {
				const asset = await tx.query.assets.findFirst({
					where: { key: imageKey },
					columns: { id: true },
				});

				if (asset != null) {
					ogImageId = asset.id;
				}
			}

			await tx
				.insert(schema.siteMetadata)
				.values({ id: 1, title, description, ogTitle, ogDescription, ogImageId })
				.onConflictDoUpdate({
					target: schema.siteMetadata.id,
					set: { title, description, ogTitle, ogDescription, ogImageId, updatedAt: sql`NOW()` },
				});
		});

		revalidatePath("/[locale]/dashboard/website/metadata", "layout");

		return createActionStateSuccess({ message: t("Metadata saved.") });
	},
);
