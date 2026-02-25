"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { ResetTwoFactorActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/two-factor/reset/_lib/reset-two-factor.schema";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

export async function resetTwoFactorAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.resetTwoFactorAction");
	const e = await getTranslations("errors");

	const { session, user } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!user.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!auth.recoveryCodeBucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		ResetTwoFactorActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof ResetTwoFactorActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!auth.recoveryCodeBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const valid = await auth.resetUserTwoFactorWithRecoveryCode(user.id, code);
	if (!valid) {
		return createActionStateError({ message: t("invalid-code") });
	}

	auth.recoveryCodeBucket.reset(user.id);

	redirect({ href: "/auth/two-factor/setup", locale });
}
