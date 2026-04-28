"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateSiteMetadataActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/metadata/_lib/update-site-metadata.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sql } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateSiteMetadataAction = createServerAction(
	async function updateSiteMetadataAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAdmin();

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

		after(async () => {
			await dispatchWebhook({ type: "site-metadata" });
		});

		revalidatePath("/[locale]/dashboard/website/metadata", "layout");

		return createActionStateSuccess({ message: t("Metadata saved.") });
	},
);
