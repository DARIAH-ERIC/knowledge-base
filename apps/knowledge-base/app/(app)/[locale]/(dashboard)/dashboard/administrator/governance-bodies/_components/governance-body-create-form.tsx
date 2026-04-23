"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { GovernanceBodyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-form";
import { createGovernanceBodyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_lib/create-governance-body.action";

interface GovernanceBodyCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
}

export function GovernanceBodyCreateForm(
	props: Readonly<GovernanceBodyCreateFormProps>,
): ReactNode {
	const { initialAssets, relatedEntities, relatedResources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New governance body")}</Heading>

			<GovernanceBodyForm
				formAction={createGovernanceBodyAction}
				initialAssets={initialAssets}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>
		</Fragment>
	);
}
