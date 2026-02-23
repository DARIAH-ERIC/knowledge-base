"use client";

import { createActionStateInitial, isActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { regenerateRecoveryCodeAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/regenerate-recovery-code-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

interface RecoveryCodeFormProps {
	recoveryCode: string;
}

export function RecoveryCodeForm(props: Readonly<RecoveryCodeFormProps>): ReactNode {
	const { recoveryCode } = props;

	const t = useTranslations("RecoveryCodeForm");

	const [state, action] = useActionState(regenerateRecoveryCodeAction, createActionStateInitial());

	const newRecoveryCode = isActionStateSuccess(state)
		? ((state.formData?.get("recovery-code") as string | null) ?? null)
		: null;

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<p>
				{t("your-code")} {newRecoveryCode ?? recoveryCode}
			</p>

			<div>
				<SubmitButton>{t("generate-new-code")}</SubmitButton>
			</div>
		</Form>
	);
}
