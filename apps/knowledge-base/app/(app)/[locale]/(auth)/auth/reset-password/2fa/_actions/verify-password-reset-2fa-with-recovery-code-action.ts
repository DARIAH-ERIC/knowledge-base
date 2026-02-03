// eslint-disable-next-line check-file/folder-naming-convention
"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	recoveryCodeBucket,
	resetUser2FAWithRecoveryCode,
	validatePasswordResetSessionRequest,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const VerifyPasswordReset2faWithRecoveryCodeActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function verifyPasswordReset2faWithRecoveryCodeAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verifyPasswordReset2FAWithRecoveryCodeAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await validatePasswordResetSessionRequest();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!session.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
		return createActionStateError({ message: "Forbidden" });
	}

	if (!recoveryCodeBucket.check(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		VerifyPasswordReset2faWithRecoveryCodeActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof VerifyPasswordReset2faWithRecoveryCodeActionInputSchema>(
			result.issues,
		);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!recoveryCodeBucket.consume(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const valid = await resetUser2FAWithRecoveryCode(session.userId, code);
	if (!valid) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	recoveryCodeBucket.reset(session.userId);

	redirect({ href: urls.resetPassword, locale });
}
