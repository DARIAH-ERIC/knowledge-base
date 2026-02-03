// eslint-disable-next-line check-file/folder-naming-convention
"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { verifyTOTP } from "@dariah-eric/auth";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	getCurrentSession,
	getUserTOTPKey,
	setSessionAs2FAVerified,
	totpBucket,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const Verify2faActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function verify2faAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verify2FAAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}

	if (!user.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}

	if (!totpBucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(Verify2faActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof Verify2faActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!totpBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const totpKey = await getUserTOTPKey(user.id);

	if (totpKey == null) {
		return createActionStateError({ message: e("forbidden") });
	}

	if (!verifyTOTP(totpKey, 30, 6, code)) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	totpBucket.reset(user.id);

	await setSessionAs2FAVerified(session.id);

	redirect({ href: urls.afterSignIn, locale });
}
