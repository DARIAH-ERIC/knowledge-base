"use server";

import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";

export async function resendEmailVerificationCodeAction(): Promise<ActionState> {
	const t = await getTranslations("actions.resendEmailVerificationCodeAction");
	const e = await getTranslations("errors");

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

	let verificationRequest = await auth.getEmailVerificationRequestFromRequest();

	if (verificationRequest == null) {
		if (user.isEmailVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!auth.sendVerificationEmailBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		verificationRequest = await auth.createEmailVerificationRequest(user.id, user.email);
	} else {
		if (!auth.sendVerificationEmailBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		verificationRequest = await auth.createEmailVerificationRequest(
			user.id,
			verificationRequest.email,
		);
	}

	await auth.sendVerificationEmail(verificationRequest.email, verificationRequest.code);
	await auth.setEmailVerificationRequestCookie(
		verificationRequest.token,
		verificationRequest.expiresAt,
	);

	return createActionStateSuccess({ message: t("new-code-sent") });
}
