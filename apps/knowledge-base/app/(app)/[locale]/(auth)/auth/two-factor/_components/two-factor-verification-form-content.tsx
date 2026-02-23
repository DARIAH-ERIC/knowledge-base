// eslint-disable-next-line check-file/folder-naming-convention
"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verify2faAction } from "@/app/(app)/[locale]/(auth)/auth/2fa/_actions/verify-2fa-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface TwoFactorVerificationFormContentProps {
	codeLabel: string;
	submitLabel: string;
}

export function TwoFactorVerificationFormContent(
	props: Readonly<TwoFactorVerificationFormContentProps>,
): ReactNode {
	const { codeLabel, submitLabel } = props;

	const [state, action] = useActionState(verify2faAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="one-time-code" autoFocus={true} isRequired={true} name="code">
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
