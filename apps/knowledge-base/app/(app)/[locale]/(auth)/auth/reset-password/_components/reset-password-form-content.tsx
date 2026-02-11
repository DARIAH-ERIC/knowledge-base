"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { resetPasswordAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/_actions/reset-password-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface ResetPasswordFormContentProps {
	confirmPasswordLabel: string;
	passwordLabel: string;
	submitLabel: string;
}

export function ResetPasswordFormContent(
	props: Readonly<ResetPasswordFormContentProps>,
): ReactNode {
	const { confirmPasswordLabel, passwordLabel, submitLabel } = props;

	const [state, action] = useActionState(resetPasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="new-password" isRequired={true} name="password" type="password">
				<Label>{passwordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				autoComplete="new-password"
				isRequired={true}
				name="password-confirmation"
				type="password"
			>
				<Label>{confirmPasswordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
