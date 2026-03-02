"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { VerifyPasswordResetTwoFactorWithTotpActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/reset-password/two-factor/_lib/verify-password-reset-two-factor-with-totp.schema";
import { auth } from "@/lib/auth";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const verifyPasswordResetTwoFactorWithTotpAction = createServerAction(
	async function verifyPasswordResetTwoFactorWithTotpAction(state, formData) {
		const locale = await getLocale();
		const t = await getTranslations("actions.verifyPasswordResetTwoFactorWithTotpAction");
		const e = await getTranslations("errors");

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const { session, user } = await auth.validatePasswordResetSessionFromRequest();

		if (session == null) {
			return createActionStateError({ message: e("not-authenticated") });
		}
		if (!session.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!auth.totpBucket.check(session.userId, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const result = await v.safeParseAsync(
			VerifyPasswordResetTwoFactorWithTotpActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof VerifyPasswordResetTwoFactorWithTotpActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { code } = result.output;

		const totpKey = await auth.getUserTotpKey(session.userId);
		if (totpKey == null) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!auth.totpBucket.consume(session.userId, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}
		if (!auth.verifyTotp(totpKey, code)) {
			return createActionStateError({ message: t("incorrect-code") });
		}

		auth.totpBucket.reset(session.userId);

		await auth.setPasswordResetSessionAsTwoFactorVerified(session.id);

		redirect({ href: "/auth/reset-password", locale });
	},
);
