"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { signInAction } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_actions/sign-in-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface SignInFormContentProps {
	emailLabel: string;
	passwordLabel: string;
	submitLabel: string;
}

export function SignInFormContent(props: Readonly<SignInFormContentProps>): ReactNode {
	const { emailLabel, passwordLabel, submitLabel } = props;

	const [state, action] = useActionState(signInAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{emailLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="current-password" isRequired={true} name="password" type="password">
				<Label>{passwordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
