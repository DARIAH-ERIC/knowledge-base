"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { UpdateAssetMetadataInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/update-asset-metadata.schema";
import { assertAdmin } from "@/lib/auth/session";
import { updateAssetMetadata } from "@/lib/data/assets";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateAssetMetadataAction = createServerAction(
	async function updateAssetMetadataAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAdmin();

		const validation = await v.safeParseAsync(
			UpdateAssetMetadataInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!validation.success) {
			const errors = v.flatten<typeof UpdateAssetMetadataInputSchema>(validation.issues);

			return createActionStateError({
				formData,
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		await updateAssetMetadata(validation.output);

		revalidatePath("/[locale]/dashboard/website/assets", "page");

		return createActionStateSuccess({
			message: t("Asset metadata saved."),
		});
	},
);
