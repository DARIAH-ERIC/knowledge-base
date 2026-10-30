"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { updateDocumentPolicyAliasesAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-policy-aliases.action";

interface AliasOption {
	/** Entity id of a published documents-policies entry. */
	id: string;
	title: string;
}

/** Display label per alias key, shared by the form and the badges in the documents list. */
export function useDocumentPolicyAliasLabels(): Record<schema.DocumentPolicyAliasKey, string> {
	const t = useExtracted();

	return {
		statutes: t("Current statutes"),
		"internal-rules-of-procedure": t("Current internal rules of procedure"),
	};
}

interface DocumentPolicyAliasesFormProps {
	/** Entity id each alias points to, `null` when the alias is not set. */
	aliases: Record<schema.DocumentPolicyAliasKey, string | null>;
	options: Array<AliasOption>;
}

export function DocumentPolicyAliasesForm(
	props: Readonly<DocumentPolicyAliasesFormProps>,
): ReactNode {
	const { aliases, options } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		updateDocumentPolicyAliasesAction,
		createActionStateInitial(),
	);

	const labels = useDocumentPolicyAliasLabels();

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection
					description={t(
						"The published documents or policies the website serves at its stable statutes and internal rules of procedure urls.",
					)}
					title={t("Stable links")}
				>
					{(Object.keys(labels) as Array<schema.DocumentPolicyAliasKey>).map((key) => (
						<AliasSelect
							key={key}
							defaultValue={aliases[key]}
							label={labels[key]}
							name={key}
							options={options}
						/>
					))}
				</FormSection>

				<div className="flex items-center justify-end gap-x-3">
					<FormStatus className="text-sm" state={state} />

					<Button isPending={isPending} type="submit">
						{isPending ? <span aria-hidden={true}>{t("Saving...")}</span> : t("Save")}
					</Button>
				</div>
			</Form>
		</FormLayout>
	);
}

interface AliasSelectProps {
	defaultValue: string | null;
	label: string;
	name: string;
	options: Array<AliasOption>;
}

function AliasSelect(props: Readonly<AliasSelectProps>): ReactNode {
	const { defaultValue, label, name, options } = props;

	const t = useExtracted();

	const [value, setValue] = useState<string | null>(defaultValue);

	return (
		<Fragment>
			<Select
				onChange={(key) => {
					setValue(key == null || key === "none" ? null : String(key));
				}}
				value={value ?? "none"}
			>
				<Label>{label}</Label>
				<SelectTrigger />
				<FieldError />
				<SelectContent>
					<SelectItem id="none">{t("None")}</SelectItem>
					{options.map((option) => (
						<SelectItem key={option.id} id={option.id}>
							{option.title}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{value != null ? <input name={name} type="hidden" value={value} /> : null}
		</Fragment>
	);
}
