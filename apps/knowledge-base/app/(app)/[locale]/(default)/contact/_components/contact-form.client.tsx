"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { type ReactNode, useActionState } from "react";
import { Input, Label, TextArea, TextField } from "react-aria-components";

import { sendContactFormEmailAction } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.action";

interface ContactFormProps {
	emailLabel: string;
	messageLabel: string;
	nameLabel: string;
	subjectLabel: string;
	submitLabel: string;
}

export function ContactForm(props: Readonly<ContactFormProps>): ReactNode {
	const { emailLabel, messageLabel, nameLabel, subjectLabel, submitLabel } = props;

	const [state, action] = useActionState(sendContactFormEmailAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-8" state={state}>
			<FormStatus state={state} />

			<TextField
				autoComplete="email"
				defaultValue={(state.formData?.get("email") ?? "") as string}
				isRequired={true}
				name="email"
				type="email"
			>
				<Label>{emailLabel}</Label>
				<Input />
			</TextField>

			<TextField
				defaultValue={(state.formData?.get("name") ?? "") as string}
				isRequired={true}
				name="name"
			>
				<Label>{nameLabel}</Label>
				<Input />
			</TextField>

			<TextField
				defaultValue={(state.formData?.get("subject") ?? "") as string}
				isRequired={true}
				name="subject"
			>
				<Label>{subjectLabel}</Label>
				<Input />
			</TextField>

			<TextField
				defaultValue={(state.formData?.get("message") ?? "") as string}
				isRequired={true}
				name="message"
			>
				<Label>{messageLabel}</Label>
				<TextArea rows={5} />
			</TextField>

			<div>
				<SubmitButton>{submitLabel}</SubmitButton>
			</div>
		</Form>
	);
}
