"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import {
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UploadImageInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.schema";
import { imageGridOptions } from "@/config/assets.config";
import { assertAdmin } from "@/lib/auth/session";
import { uploadAsset } from "@/lib/data/assets";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { images } from "@/lib/images";
import { createServerAction } from "@/lib/server/create-server-action";

export const uploadImageAction = createServerAction<
	{ key: string; url: string },
	GetValidationErrors<typeof UploadImageInputSchema>
>(async function uploadImageAction(state, formData) {
	const locale = await getLocale();
	const t = await getExtracted();

	// FIXME:
	const { user: _ } = await assertAdmin();
	// await assertAuthorized(user)

	const validation = await v.safeParseAsync(UploadImageInputSchema, getFormDataValues(formData), {
		lang: getIntlLanguage(locale),
	});

	if (!validation.success) {
		const errors = v.flatten<typeof UploadImageInputSchema>(validation.issues);

		return createActionStateError({
			formData,
			message: errors.root ?? t("Invalid or missing fields."),
			validationErrors: errors.nested,
		});
	}

	const { file, licenseId, prefix, label, alt, caption } = validation.output;

	const { key } = await uploadAsset({ file, licenseId, prefix, label, alt, caption });
	const { url } = images.generateSignedImageUrl({ key, options: imageGridOptions });

	revalidatePath("/[locale]/dashboard/website/assets", "page");
	revalidatePath("/[locale]/dashboard/administrator/persons", "layout");

	return createActionStateSuccess({
		message: t("Successfully uploaded image."),
		data: { key, url },
	});
});
