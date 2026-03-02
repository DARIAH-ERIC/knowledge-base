"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { ResetPasswordActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/reset-password/_lib/reset-password.schema";
import { auth } from "@/lib/auth";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const resetPasswordAction = createServerAction(
	async function resetPasswordAction(state, formData) {
		const locale = await getLocale();
		const t = await getTranslations("actions.resetPasswordAction");
		const e = await getTranslations("errors");

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const { session: passwordResetSession, user } =
			await auth.validatePasswordResetSessionFromRequest();

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
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof ResetPasswordActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { password } = result.output;

		const isStrongPassword = await auth.verifyPasswordStrength(password);
		if (!isStrongPassword) {
			return createActionStateError({ message: t("weak-password") });
		}

		await auth.deleteUserPasswordResetSessions(passwordResetSession.userId);
		await auth.deleteUserSessions(passwordResetSession.userId);
		await auth.updatePassword(passwordResetSession.userId, password);

		const session = await auth.createSession(user.id, passwordResetSession.isTwoFactorVerified);
		await auth.setSessionCookie(session.token, session.expiresAt);
		await auth.deletePasswordResetSessionCookie();

		redirect({ href: "/", locale });
	},
);
