"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { setupTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/setup/_lib/setup-two-factor.action";

interface TwoFactorSetUpFormProps {
	encodedTotpKey: string;
}

export function TwoFactorSetUpForm(props: Readonly<TwoFactorSetUpFormProps>): ReactNode {
	const { encodedTotpKey } = props;

	const t = useTranslations("TwoFactorSetUpForm");

	const [state, action] = useActionState(setupTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<input hidden={true} name="key" readOnly={true} required={true} value={encodedTotpKey} />

			<TextField isRequired={true} name="code">
				<Label>{t("verify")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
