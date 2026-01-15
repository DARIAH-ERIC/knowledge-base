"use server";

import { getFormDataValues, includes, log } from "@acdh-oeaw/lib";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";
import { assetPrefixes, uploadAsset } from "@/lib/data/assets";
import {
	type ActionState,
	createErrorActionState,
	createSuccessActionState,
} from "@/lib/server/actions";
import { ForbiddenError, RateLimitError } from "@/lib/server/errors";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const InputSchema = v.object({
	file: v.pipe(
		v.instance(File),
		v.check((input) => {
			return includes(imageMimeTypes, input.type);
		}),
		v.check((input) => {
			return input.size <= imageSizeLimit;
		}),
	),
	prefix: v.picklist(assetPrefixes),
});

export async function uploadImageAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	try {
		if (!(await globalPOSTRateLimit())) {
			throw new RateLimitError();
		}

		// FIXME:
		// const user = await assertAuthenticated()
		// await assertAuthorized(user)

		const t = await getTranslations("actions.uploadImageAction");

		const { file, prefix } = await v.parseAsync(InputSchema, getFormDataValues(formData));

		const { key } = await uploadAsset({ file, prefix });

		revalidatePath("/dashboard/website/assets", "page");

		return createSuccessActionState({ message: t("success"), data: { key } });
	} catch (error) {
		log.error(error);

		const e = await getTranslations("errors");

		if (error instanceof ForbiddenError) {
			return createErrorActionState({ message: e("forbidden") });
		}

		if (error instanceof RateLimitError) {
			return createErrorActionState({ message: e("too-many-requests") });
		}

		if (v.isValiError<typeof InputSchema>(error)) {
			const errors = v.flatten<typeof InputSchema>(error.issues);

			return createErrorActionState({
				message: errors.root ?? e("invalid-form-fields"),
				errors: errors.nested,
			});
		}

		return createErrorActionState({ message: e("internal-server-error") });
	}
}
