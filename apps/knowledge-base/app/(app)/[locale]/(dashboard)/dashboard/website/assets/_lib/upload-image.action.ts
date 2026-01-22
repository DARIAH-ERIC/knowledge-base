"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { UploadImageInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.schema";
import { uploadAsset } from "@/lib/data/assets";
import { getIntlLanguage } from "@/lib/i18n/locales";
import {
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@/lib/server/actions";
import { createServerAction } from "@/lib/server/actions/create-server-action";

export const uploadImageAction = createServerAction<
	{ key: string },
	GetValidationErrors<typeof UploadImageInputSchema>
>(async function uploadImageAction(state, formData) {
	const e = await getTranslations("errors");

	// FIXME:
	// const user = await assertAuthenticated()
	// await assertAuthorized(user)

	const locale = await getLocale();
	const t = await getTranslations("actions.uploadImageAction");

	const validation = await v.safeParseAsync(UploadImageInputSchema, getFormDataValues(formData), {
		lang: getIntlLanguage(locale),
	});

	if (!validation.success) {
		const errors = v.flatten<typeof UploadImageInputSchema>(validation.issues);

		return createActionStateError({
			formData,
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { file, licenseId, prefix } = validation.output;

	const { key } = await uploadAsset({ file, licenseId, prefix });

	revalidatePath("/dashboard/website/assets", "page");

	return createActionStateSuccess({ message: t("success"), data: { key } });
});
