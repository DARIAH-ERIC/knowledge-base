"use client";

import { type ReactNode, useActionState } from "react";

import { resendEmailVerificationCodeAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_actions/resend-email-verification-code-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface ResendEmailVerificationCodeFormContentProps {
	resendCodeLabel: string;
}

export function ResendEmailVerificationCodeFormContent(
	props: Readonly<ResendEmailVerificationCodeFormContentProps>,
): ReactNode {
	const { resendCodeLabel } = props;

	const [state, action] = useActionState(
		resendEmailVerificationCodeAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} className="grid gap-y-8" state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<div>
				<SubmitButton>{resendCodeLabel}</SubmitButton>
			</div>
		</Form>
	);
}
