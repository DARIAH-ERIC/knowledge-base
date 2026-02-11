"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyEmailAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_actions/verify-email-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface EmailVerificationFormContentProps {
	codeLabel: string;
	verifyLabel: string;
}

export function EmailVerificationFormContent(
	props: Readonly<EmailVerificationFormContentProps>,
): ReactNode {
	const { codeLabel, verifyLabel } = props;

	const [state, action] = useActionState(verifyEmailAction, createActionStateInitial());

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
				<SubmitButton>{verifyLabel}</SubmitButton>
			</div>
		</Form>
	);
}
