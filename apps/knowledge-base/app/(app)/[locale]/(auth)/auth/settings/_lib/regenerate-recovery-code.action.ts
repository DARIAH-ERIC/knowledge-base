"use server";

import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";

export async function regenerateRecoveryCodeAction(): Promise<ActionState> {
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await getCurrentSession();


	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!user.isEmailVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}

	const recoveryCode = await auth.resetRecoveryCode(user.id);
	const formData = new FormData();
	formData.set("recovery-code", recoveryCode);

	return createActionStateSuccess({ formData });
}
