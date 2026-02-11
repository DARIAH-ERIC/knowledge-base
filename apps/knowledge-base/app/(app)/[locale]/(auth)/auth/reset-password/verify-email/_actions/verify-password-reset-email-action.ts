"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	setPasswordResetSessionAsEmailVerified,
	setUserAsEmailVerifiedIfEmailMatches,
	validatePasswordResetSessionRequest,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";
import { ExpiringTokenBucket } from "@/lib/server/rate-limit/rate-limiter";

const emailVerificationBucket = new ExpiringTokenBucket<string>(5, 60 * 30);

const VerifyPasswordResetEmailActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function verifyPasswordResetEmailAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.verifyPasswordResetEmailAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session } = await validatePasswordResetSessionRequest();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (session.isEmailVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!emailVerificationBucket.check(session.userId, 1)) {
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

	if (!emailVerificationBucket.consume(session.userId, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (code !== session.code) {
		return createActionStateError({ message: t("incorrect-code") });
	}

	emailVerificationBucket.reset(session.userId);
	await setPasswordResetSessionAsEmailVerified(session.id);

	const emailMatches = await setUserAsEmailVerifiedIfEmailMatches(session.userId, session.email);
	if (!emailMatches) {
		return createActionStateError({ message: t("restart") });
	}

	redirect({ href: urls.resetPassword2fa, locale });
}
