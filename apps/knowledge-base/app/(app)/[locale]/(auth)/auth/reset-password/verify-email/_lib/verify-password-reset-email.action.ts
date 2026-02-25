"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { VerifyPasswordResetEmailActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_lib/verify-password-reset-email.schema";
import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";

export async function verifyPasswordResetEmailAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verifyPasswordResetEmailAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session } = await auth.validatePasswordResetSessionFromRequest();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (session.isEmailVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!auth.emailVerificationBucket.check(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		VerifyPasswordResetEmailActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof VerifyPasswordResetEmailActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!auth.emailVerificationBucket.consume(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (code !== session.code) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	auth.emailVerificationBucket.reset(session.userId);
	await auth.setPasswordResetSessionAsEmailVerified(session.id);

	const emailMatches = await auth.setUserAsEmailVerifiedIfEmailMatches(
		session.userId,
		session.email,
	);
	if (!emailMatches) {
		return createActionStateError({ message: t("restart") });
	}

	redirect({ href: "/auth/reset-password/two-factor", locale });
}
