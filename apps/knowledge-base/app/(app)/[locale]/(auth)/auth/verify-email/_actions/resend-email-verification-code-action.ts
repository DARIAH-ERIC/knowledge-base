"use server";

import { getTranslations } from "next-intl/server";

import {
	createEmailVerificationRequest,
	getCurrentSession,
	getUserEmailVerificationRequestFromRequest,
	sendVerificationEmail,
	sendVerificationEmailBucket,
	setEmailVerificationRequestCookie,
} from "@/lib/data/users";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
} from "@/lib/server/actions";

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
	if (!sendVerificationEmailBucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	let verificationRequest = await getUserEmailVerificationRequestFromRequest();

	if (verificationRequest == null) {
		if (user.isEmailVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!sendVerificationEmailBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		verificationRequest = await createEmailVerificationRequest(user.id, user.email);
	} else {
		if (!sendVerificationEmailBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		verificationRequest = await createEmailVerificationRequest(user.id, verificationRequest.email);
	}

	await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
	await setEmailVerificationRequestCookie(verificationRequest);

	return createActionStateSuccess({ message: t("new-code-sent") });
}
