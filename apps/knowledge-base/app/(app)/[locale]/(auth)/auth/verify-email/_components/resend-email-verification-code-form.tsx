"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { resendEmailVerificationCodeAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/resend-email-verification-code.action";

interface ResendEmailVerificationCodeFormProps {
	/** No code has been sent yet, so this sends the first one. */
	isInitialRequest: boolean;
}

export function ResendEmailVerificationCodeForm(
	props: Readonly<ResendEmailVerificationCodeFormProps>,
): ReactNode {
	const { isInitialRequest } = props;

	const t = useExtracted();

	const [state, action] = useActionState(
		resendEmailVerificationCodeAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<SubmitButton className="mbs-2" intent={isInitialRequest ? "primary" : "secondary"}>
				{isInitialRequest ? t("Send verification code") : t("Resend verification code")}
			</SubmitButton>
		</Form>
	);
}
