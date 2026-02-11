"use server";

import { getTranslations } from "next-intl/server";

import { getCurrentSession, resetUserRecoveryCode } from "@/lib/data/users";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
} from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export async function regenerateRecoveryCodeAction(): Promise<ActionState> {
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await getCurrentSession();

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (session == null || user == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (!user.isEmailVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}

	const recoveryCode = await resetUserRecoveryCode(session.userId);
	const formData = new FormData();
	formData.set("recovery-code", recoveryCode);

	return createActionStateSuccess({ formData });
}
