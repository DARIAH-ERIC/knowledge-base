// eslint-disable-next-line check-file/folder-naming-convention
"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	getCurrentSession,
	recoveryCodeBucket,
	resetUser2FAWithRecoveryCode,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";

const Reset2faActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
});

export async function reset2faAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.reset2FAAction");
	const e = await getTranslations("errors");

	const { session, user } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!user.isEmailVerified || !user.isTwoFactorRegistered || session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!recoveryCodeBucket.check(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(Reset2faActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof Reset2faActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { code } = result.output;

	if (!recoveryCodeBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const valid = await resetUser2FAWithRecoveryCode(user.id, code);
	if (!valid) {
		return createActionStateError({ message: t("invalid-code") });
	}

	recoveryCodeBucket.reset(user.id);

	redirect({ href: urls["2faSetup"], locale });
}
