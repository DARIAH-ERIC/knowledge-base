// eslint-disable-next-line check-file/folder-naming-convention
"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { reset2faAction } from "@/app/(app)/[locale]/(auth)/auth/2fa/reset/_actions/reset-2fa-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface TwoFactorResetFormContentProps {
	recoveryCodeLabel: string;
	submitLabel: string;
}

export function TwoFactorResetFormContent(
	props: Readonly<TwoFactorResetFormContentProps>,
): ReactNode {
	const { recoveryCodeLabel, submitLabel } = props;

	const [state, action] = useActionState(reset2faAction, createActionStateInitial());

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
