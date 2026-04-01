"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DocumentOrPolicyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-form";
import { createDocumentOrPolicyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy.action";

interface DocumentOrPolicyCreateFormProps {
	assets: Array<{ key: string; label: string; url: string }>;
}

export function DocumentOrPolicyCreateForm(
	props: Readonly<DocumentOrPolicyCreateFormProps>,
): ReactNode {
	const { assets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New document or policy")}</Heading>

			<DocumentOrPolicyForm assets={assets} formAction={createDocumentOrPolicyAction} />
		</Fragment>
	);
}
