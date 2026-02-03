"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyPasswordResetEmailAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_actions/verify-password-reset-email-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface PasswordResetEmailVerificationFormContentProps {
	codeLabel: string;
	submitLabel: string;
}

export function PasswordResetEmailVerificationFormContent(
	props: Readonly<PasswordResetEmailVerificationFormContentProps>,
): ReactNode {
	const { codeLabel, submitLabel } = props;

	const [state, action] = useActionState(
		verifyPasswordResetEmailAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField isRequired={true} name="code">
				<Label>{codeLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
