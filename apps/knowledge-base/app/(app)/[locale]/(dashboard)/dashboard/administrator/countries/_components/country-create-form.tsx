"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { CountryForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-form";
import { createCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/create-country.action";

interface CountryCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
}

export function CountryCreateForm(props: Readonly<CountryCreateFormProps>): ReactNode {
	const { initialAssets, relatedEntities, relatedResources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New country")}</Heading>

			<CountryForm
				formAction={createCountryAction}
				initialAssets={initialAssets}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>
		</Fragment>
	);
}
