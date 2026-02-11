"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	createEmailVerificationRequest,
	getCurrentSession,
	isUserEmailAvailable,
	sendVerificationEmail,
	sendVerificationEmailBucket,
	setEmailVerificationRequestCookie,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

const UpdateEmailActionInputSchema = v.object({
	email: v.pipe(v.string(), v.email()),
});

export async function updateEmailAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.updateEmailAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

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

	const result = await v.safeParseAsync(UpdateEmailActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof UpdateEmailActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email } = result.output;

	const emailAvailable = await isUserEmailAvailable(email);
	if (!emailAvailable) {
		return createActionStateError({ message: t("email-in-use") });
	}
	if (!sendVerificationEmailBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const verificationRequest = await createEmailVerificationRequest(user.id, email);
	await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
	await setEmailVerificationRequestCookie(verificationRequest);

	redirect({ href: urls.verifyEmail, locale });
}
