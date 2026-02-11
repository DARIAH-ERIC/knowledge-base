"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { forgotPasswordAction } from "@/app/(app)/[locale]/(auth)/auth/forgot-password/_actions/forgot-password-action";
import { Form } from "@/components/form";
import { FormErrorMessage } from "@/components/form-error-message";
import { FormSuccessMessage } from "@/components/form-success-message";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface ForgotPasswordFormContentProps {
	emailLabel: string;
	submitLabel: string;
}

export function ForgotPasswordFormContent(
	props: Readonly<ForgotPasswordFormContentProps>,
): ReactNode {
	const { emailLabel, submitLabel } = props;

	const [state, action] = useActionState(forgotPasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormErrorMessage state={state} />
			<FormSuccessMessage state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{emailLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
