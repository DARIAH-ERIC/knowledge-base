// eslint-disable-next-line check-file/folder-naming-convention
"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyPasswordReset2faWithRecoveryCodeAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/2fa/_actions/verify-password-reset-2fa-with-recovery-code-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface PasswordResetRecoveryCodeFormContentProps {
	recoveryCodeLabel: string;
	submitLabel: string;
}

export function PasswordResetRecoveryCodeFormContent(
	props: Readonly<PasswordResetRecoveryCodeFormContentProps>,
): ReactNode {
	const { recoveryCodeLabel, submitLabel } = props;

	const [state, action] = useActionState(
		verifyPasswordReset2faWithRecoveryCodeAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField isRequired={true} name="code">
				<Label>{recoveryCodeLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
