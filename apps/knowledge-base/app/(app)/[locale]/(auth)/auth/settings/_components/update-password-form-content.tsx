"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { updatePasswordAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/update-password-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface UpdatePasswordFormContentProps {
	confirmNewPasswordLabel: string;
	currentPasswordLabel: string;
	newPasswordLabel: string;
	submitLabel: string;
}

export function UpdatePasswordFormContent(
	props: Readonly<UpdatePasswordFormContentProps>,
): ReactNode {
	const { confirmNewPasswordLabel, currentPasswordLabel, newPasswordLabel, submitLabel } = props;

	const [state, action] = useActionState(updatePasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="current-password" isRequired={true} name="password" type="password">
				<Label>{currentPasswordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="new-password" isRequired={true} name="new-password" type="password">
				<Label>{newPasswordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				autoComplete="new-password"
				isRequired={true}
				name="new-password-confirmation"
				type="password"
			>
				<Label>{confirmNewPasswordLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
