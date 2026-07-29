"use client";

import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { CountryForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-form";
import { createCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/create-country.action";

interface CountryCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	initialSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal: number;
}

export function CountryCreateForm(props: Readonly<CountryCreateFormProps>): ReactNode {
	const {
		initialAssets,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		initialSocialMediaItems,
		initialSocialMediaTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader title={t("New country")} />

			<CountryForm
				formAction={createCountryAction}
				initialAssets={initialAssets}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				initialSocialMediaItems={initialSocialMediaItems}
				initialSocialMediaTotal={initialSocialMediaTotal}
				showSaveAndPublish={true}
			/>
		</Fragment>
	);
}
