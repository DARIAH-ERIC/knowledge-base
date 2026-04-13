"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DocumentOrPolicyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-form";
import { createDocumentOrPolicyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy.action";

interface DocumentOrPolicyCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
}

export function DocumentOrPolicyCreateForm(
	props: Readonly<DocumentOrPolicyCreateFormProps>,
): ReactNode {
	const { initialAssets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New document or policy")}</Heading>

			<DocumentOrPolicyForm
				formAction={createDocumentOrPolicyAction}
				initialAssets={initialAssets}
			/>
		</Fragment>
	);
}
