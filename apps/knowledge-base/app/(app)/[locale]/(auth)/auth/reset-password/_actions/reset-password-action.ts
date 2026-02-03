"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { verifyPasswordStrength } from "@dariah-eric/auth";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { passwordMaxLength, passwordMinLength, urls } from "@/config/auth.config";
import {
	createSession,
	deletePasswordResetSessionTokenCookie,
	generateSessionToken,
	invalidateUserPasswordResetSessions,
	invalidateUserSessions,
	setSessionTokenCookie,
	updateUserPassword,
	validatePasswordResetSessionRequest,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const ResetPasswordActionInputSchema = v.pipe(
	v.object({
		password: v.pipe(v.string(), v.minLength(passwordMinLength), v.maxLength(passwordMaxLength)),
		"password-confirmation": v.pipe(v.string(), v.nonEmpty()),
	}),
	v.forward(
		v.partialCheck(
			[["password"], ["password-confirmation"]],
			(input) => {
				return input["password-confirmation"] === input.password;
			},
			"Passwords don't match.",
		),
		["password-confirmation"],
	),
);

export async function resetPasswordAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.resetPasswordAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session: passwordResetSession, user } = await validatePasswordResetSessionRequest();

	if (passwordResetSession == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!passwordResetSession.isEmailVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (user.isTwoFactorRegistered && !passwordResetSession.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}

	const result = await v.safeParseAsync(
		ResetPasswordActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof ResetPasswordActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { password } = result.output;

	const strongPassword = await verifyPasswordStrength(password);
	if (!strongPassword) {
		return createActionStateError({ message: t("weak-password") });
	}

	await invalidateUserPasswordResetSessions(passwordResetSession.userId);
	await invalidateUserSessions(passwordResetSession.userId);
	await updateUserPassword(passwordResetSession.userId, password);

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, {
		isTwoFactorVerified: passwordResetSession.isTwoFactorVerified,
	});
	await setSessionTokenCookie(sessionToken, session.expiresAt);
	await deletePasswordResetSessionTokenCookie();

	redirect({ href: urls.afterSignIn, locale });
}
