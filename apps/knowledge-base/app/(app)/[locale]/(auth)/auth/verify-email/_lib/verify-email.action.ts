"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { ExpiringTokenBucket } from "@dariah-eric/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30);

const VerifyEmailActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function verifyEmailAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verifyEmailAction");
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
	if (!bucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	let verificationRequest = await auth.getEmailVerificationRequestFromRequest();

	if (verificationRequest == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}

	const result = await v.safeParseAsync(VerifyEmailActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof VerifyEmailActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!bucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const now = Date.now()
	if (now >= verificationRequest.expiresAt.getTime()) {
		verificationRequest = await auth.createEmailVerificationRequest(
			verificationRequest.userId,
			verificationRequest.email,
		);

		await auth.sendVerificationEmail(verificationRequest.email, verificationRequest.code);

		return createActionStateError({
			message: t("code-expired"),
		});
	}

	if (verificationRequest.code !== code) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	await auth.deleteEmailVerificationRequest(user.id);
	await auth.deletePasswordResetSessions(user.id);
	await auth.updateEmailAndSetEmailAsVerified(user.id, verificationRequest.email);
	await auth.deleteEmailVerificationRequestCookie();

	if (!user.isTwoFactorRegistered) {
		redirect({ href: "/auth/two-factor/setup", locale });
	}

	redirect({ href: "/", locale });
}
