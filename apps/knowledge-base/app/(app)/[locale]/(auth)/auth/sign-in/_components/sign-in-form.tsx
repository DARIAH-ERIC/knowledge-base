"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { signInAction } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_lib/sign-in.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";

export function SignInForm(): ReactNode {
	const t = useTranslations("SignInForm");

	const [state, action] = useActionState(signInAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("email")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="current-password" isRequired={true} name="password" type="password">
				<Label>{t("password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
