"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { createNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/create-national-consortium.action";

interface NationalConsortiumCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
}

export function NationalConsortiumCreateForm(
	props: Readonly<NationalConsortiumCreateFormProps>,
): ReactNode {
	const { initialAssets, relatedEntities, relatedResources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New national consortium")}</Heading>

			<NationalConsortiumForm
				formAction={createNationalConsortiumAction}
				initialAssets={initialAssets}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>
		</Fragment>
	);
}
