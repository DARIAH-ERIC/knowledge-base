// eslint-disable-next-line check-file/folder-naming-convention
"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { verifyTOTP } from "@dariah-eric/auth";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	getUserTOTPKey,
	setPasswordResetSessionAs2FAVerified,
	totpBucket,
	validatePasswordResetSessionRequest,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const VerifyPasswordReset2faWithTOTPActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function verifyPasswordReset2faWithTOTPAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verifyPasswordReset2FAWithTOTPAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await validatePasswordResetSessionRequest();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!session.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!totpBucket.check(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		VerifyPasswordReset2faWithTOTPActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof VerifyPasswordReset2faWithTOTPActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	const totpKey = await getUserTOTPKey(session.userId);
	if (totpKey == null) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!totpBucket.consume(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (!verifyTOTP(totpKey, 30, 6, code)) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	totpBucket.reset(session.userId);

	await setPasswordResetSessionAs2FAVerified(session.id);

	redirect({ href: urls.resetPassword, locale });
}
