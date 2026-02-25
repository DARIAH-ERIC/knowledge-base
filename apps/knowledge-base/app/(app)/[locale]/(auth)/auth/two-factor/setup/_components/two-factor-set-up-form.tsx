"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { setupTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/setup/_lib/setup-two-factor.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

interface TwoFactorSetUpFormProps {
	encodedTotpKey: string;
}

export function TwoFactorSetUpForm(props: Readonly<TwoFactorSetUpFormProps>): ReactNode {
	const { encodedTotpKey } = props;

	const t = useTranslations("TwoFactorSetUpForm");

	const [state, action] = useActionState(setupTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<input hidden={true} name="key" readOnly={true} required={true} value={encodedTotpKey} />

			<TextField isRequired={true} name="code">
				<Label>{t("verify")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
