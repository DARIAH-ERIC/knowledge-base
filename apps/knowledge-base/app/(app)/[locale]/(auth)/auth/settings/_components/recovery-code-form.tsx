"use client";

import { createActionStateInitial, isActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { regenerateRecoveryCodeAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_lib/regenerate-recovery-code.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/ui/form-status";
import { SubmitButton } from "@/components/ui/submit-button";
import { Text } from "@/components/ui/text";

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
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<Text>
				{t("your-code")} <span className="text-fg">{newRecoveryCode ?? recoveryCode}</span>
			</Text>

			<SubmitButton className="mt-2">{t("generate-new-code")}</SubmitButton>
		</Form>
	);
}
