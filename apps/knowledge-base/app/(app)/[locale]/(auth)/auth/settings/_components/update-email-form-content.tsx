"use client";

import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { updateEmailAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/update-email-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface UpdateEmailFormContentProps {
	newEmailLabel: string;
	submitLabel: string;
}

export function UpdateEmailFormContent(props: Readonly<UpdateEmailFormContentProps>): ReactNode {
	const { newEmailLabel, submitLabel } = props;

	const [state, action] = useActionState(updateEmailAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{newEmailLabel}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
