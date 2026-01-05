"use sever";

import { getFormDataValues, includes, log } from "@acdh-oeaw/lib";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";
import { uploadAsset } from "@/lib/data/assets";
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

		const { file } = await v.parseAsync(InputSchema, getFormDataValues(formData));

		const { objectName } = await uploadAsset({ file });

		return createSuccessActionState({ message: t("success"), data: { objectName } });
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
