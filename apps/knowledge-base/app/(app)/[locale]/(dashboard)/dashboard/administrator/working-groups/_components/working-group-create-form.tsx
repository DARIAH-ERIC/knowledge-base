"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { WorkingGroupForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-form";
import { createWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group.action";

interface WorkingGroupCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
}

export function WorkingGroupCreateForm(props: Readonly<WorkingGroupCreateFormProps>): ReactNode {
	const { initialAssets, relatedEntities, relatedResources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New working group")}</Heading>

			<WorkingGroupForm
				formAction={createWorkingGroupAction}
				initialAssets={initialAssets}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>
		</Fragment>
	);
}
