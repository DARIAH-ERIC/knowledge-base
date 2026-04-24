"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { createNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/create-national-consortium.action";

interface NationalConsortiumCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
}

export function NationalConsortiumCreateForm(
	props: Readonly<NationalConsortiumCreateFormProps>,
): ReactNode {
	const {
		initialAssets,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New national consortium")}</Heading>

			<NationalConsortiumForm
				formAction={createNationalConsortiumAction}
				initialAssets={initialAssets}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
			/>
		</Fragment>
	);
}
