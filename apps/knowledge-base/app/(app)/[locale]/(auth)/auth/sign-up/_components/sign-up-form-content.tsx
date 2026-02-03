"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { signUpAction } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_actions/sign-up-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { usernameMaxLength, usernameMinLength } from "@/config/auth.config";
import { createActionStateInitial } from "@/lib/server/actions";

interface SignUpFormContentProps {
	confirmPasswordLabel: string;
	emailLabel: string;
	passwordLabel: string;
	submitLabel: string;
	usernameLabel: string;
}

export function SignUpFormContent(props: Readonly<SignUpFormContentProps>): ReactNode {
	const { confirmPasswordLabel, emailLabel, passwordLabel, submitLabel, usernameLabel } = props;

	const [state, action] = useActionState(signUpAction, createActionStateInitial());

	return (
		<Form action={action} className="grid gap-y-8" state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField
				autoComplete="username"
				isRequired={true}
				maxLength={usernameMaxLength}
				minLength={usernameMinLength}
				name="username"
			>
				<Label>{usernameLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{emailLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

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
