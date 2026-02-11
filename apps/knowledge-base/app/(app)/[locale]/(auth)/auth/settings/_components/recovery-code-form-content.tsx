"use client";

import { type ReactNode, useActionState } from "react";

import { regenerateRecoveryCodeAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/regenerate-recovery-code-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

interface RecoveryCodeFormContentProps {
	generateNewCodeLabel: string;
	recoveryCode: string;
	yourCodeLabel: string;
}

export function RecoveryCodeFormContent(props: Readonly<RecoveryCodeFormContentProps>): ReactNode {
	const { generateNewCodeLabel, recoveryCode, yourCodeLabel } = props;

	const [state, action] = useActionState(regenerateRecoveryCodeAction, createActionStateInitial());

	const newRecoveryCode =
		state.status === "success"
			? ((state.formData?.get("recovery-code") as string | null) ?? null)
			: null;

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<p>
				{yourCodeLabel} {newRecoveryCode ?? recoveryCode}
			</p>

			<div>
				<SubmitButton>{generateNewCodeLabel}</SubmitButton>
			</div>
		</Form>
	);
}
