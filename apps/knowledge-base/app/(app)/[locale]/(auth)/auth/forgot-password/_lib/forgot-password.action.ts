"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { ForgotPasswordActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/forgot-password/_lib/forgot-password.schema";
import { auth } from "@/lib/auth";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const forgotPasswordAction = createServerAction(
	async function forgotPasswordAction(state, formData) {
		const locale = await getLocale();
		const t = await getTranslations("actions.forgotPasswordAction");
		const e = await getTranslations("errors");

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const ip = (await headers()).get("X-Forwarded-For");
		if (ip != null && !auth.passwordResetEmailIpBucket.check(ip, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const result = await v.safeParseAsync(
			ForgotPasswordActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof ForgotPasswordActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { email } = result.output;

		const user = await auth.getUserByEmail(email);
		if (user == null) {
			return createActionStateError({ message: t("invalid-account") });
		}

		if (ip != null && !auth.passwordResetEmailIpBucket.consume(ip, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}
		if (!auth.passwordResetEmailUserBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const session = await auth.createPasswordResetSession(user.id, user.email);

		await auth.sendPasswordResetEmail(session.email, session.code);
		await auth.setPasswordResetSessionCookie(session.token, session.expiresAt);

		redirect({ href: "/auth/reset-password/verify-email", locale });
	},
);
