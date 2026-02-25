"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { UpdateEmailActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/settings/_lib/update-email.schema";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

export async function updateEmailAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.updateEmailAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!auth.sendVerificationEmailBucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(UpdateEmailActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof UpdateEmailActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email } = result.output;

	const emailAvailable = await auth.isEmailAvailable(email);
	if (!emailAvailable) {
		return createActionStateError({ message: t("email-in-use") });
	}
	if (!auth.sendVerificationEmailBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const verificationRequest = await auth.createEmailVerificationRequest(user.id, email);
	await auth.sendVerificationEmail(verificationRequest.email, verificationRequest.code);
	await auth.setEmailVerificationRequestCookie(
		verificationRequest.token,
		verificationRequest.expiresAt,
	);

	redirect({ href: "/auth/verify-email", locale });
}
