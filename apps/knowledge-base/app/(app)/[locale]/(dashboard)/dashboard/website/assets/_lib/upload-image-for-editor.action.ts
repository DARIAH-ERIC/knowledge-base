"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import {
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { uploadAsset } from "@/lib/data/assets";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { images } from "@/lib/images";
import { createServerAction } from "@/lib/server/create-server-action";

const UploadImageForEditorInputSchema = v.object({
	file: v.pipe(
		v.file(),
		v.mimeType(imageMimeTypes),
		v.check((input) => {
			return input.size <= imageSizeLimit;
		}),
	),
	caption: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

export const uploadImageForEditorAction = createServerAction<
	{ src: string; assetKey: string; assetId: string; caption: string | null },
	GetValidationErrors<typeof UploadImageForEditorInputSchema>
>(async function uploadImageForEditorAction(state, formData) {
	const locale = await getLocale();
	const t = await getExtracted();

	// FIXME:
	const { user: _ } = await assertAuthenticated();
	// await assertAuthorized(user)

	const validation = await v.safeParseAsync(
		UploadImageForEditorInputSchema,
		getFormDataValues(formData),
		{ lang: getIntlLanguage(locale) },
	);

	if (!validation.success) {
		const errors = v.flatten<typeof UploadImageForEditorInputSchema>(validation.issues);

		return createActionStateError({
			formData,
			message: errors.root ?? t("Invalid or missing fields."),
			validationErrors: errors.nested,
		});
	}

	const { file, caption } = validation.output;

	const { key, id } = await uploadAsset({ file, prefix: "images", caption });

	const { url } = images.generateSignedImageUrl({ key, options: { width: 1200 } });

	return createActionStateSuccess({
		message: t("Successfully uploaded image."),
		data: { src: url, assetKey: key, assetId: id, caption: caption ?? null },
	});
});
