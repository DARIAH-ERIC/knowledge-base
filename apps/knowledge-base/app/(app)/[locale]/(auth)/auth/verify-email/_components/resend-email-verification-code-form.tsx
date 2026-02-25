"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { resendEmailVerificationCodeAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/resend-email-verification-code.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function ResendEmailVerificationCodeForm(): ReactNode {
	const t = useTranslations("ResendEmailVerificationCodeForm");

	const [state, action] = useActionState(
		resendEmailVerificationCodeAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} className="grid gap-y-8" state={state}>
			<FormStatus state={state} />

			<div>
				<SubmitButton>{t("resend-code")}</SubmitButton>
			</div>
		</Form>
	);
}
