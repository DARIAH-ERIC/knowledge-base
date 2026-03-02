"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { resendEmailVerificationCodeAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/resend-email-verification-code.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/ui/form-status";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResendEmailVerificationCodeForm(): ReactNode {
	const t = useTranslations("ResendEmailVerificationCodeForm");

	const [state, action] = useActionState(
		resendEmailVerificationCodeAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<SubmitButton className="mt-2" intent="secondary">
				{t("resend-code")}
			</SubmitButton>
		</Form>
	);
}
