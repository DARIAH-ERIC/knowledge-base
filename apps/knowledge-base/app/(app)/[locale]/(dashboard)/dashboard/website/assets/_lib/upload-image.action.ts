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
import { assertAuthenticated } from "@/lib/auth/session";
import { uploadAsset } from "@/lib/data/assets";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const uploadImageAction = createServerAction<
	{ key: string },
	GetValidationErrors<typeof UploadImageInputSchema>
>(async function uploadImageAction(state, formData) {
	const locale = await getLocale();
	const t = await getExtracted();

	// FIXME:
	const { user: _ } = await assertAuthenticated();
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

	revalidatePath("/dashboard/website/assets", "page");
	revalidatePath("/dashboard/administrator/persons", "layout");

	return createActionStateSuccess({ message: t("Successfully uploaded image."), data: { key } });
});
