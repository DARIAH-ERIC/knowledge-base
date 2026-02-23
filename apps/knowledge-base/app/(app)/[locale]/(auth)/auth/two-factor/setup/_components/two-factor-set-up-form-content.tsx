// eslint-disable-next-line check-file/folder-naming-convention
"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { setup2faAction } from "@/app/(app)/[locale]/(auth)/auth/2fa/setup/_actions/setup-2fa-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface TwoFactorSetUpFormContentProps {
	encodedTOTPKey: string;
	submitLabel: string;
	verifyLabel: string;
}

export function TwoFactorSetUpFormContent(
	props: Readonly<TwoFactorSetUpFormContentProps>,
): ReactNode {
	const { encodedTOTPKey, submitLabel, verifyLabel } = props;

	const [state, action] = useActionState(setup2faAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<input hidden={true} name="key" readOnly={true} required={true} value={encodedTOTPKey} />

			<TextField isRequired={true} name="code">
				<Label>{verifyLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
