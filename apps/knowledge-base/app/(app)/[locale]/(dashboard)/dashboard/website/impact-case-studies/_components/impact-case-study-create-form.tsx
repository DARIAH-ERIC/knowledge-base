"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ImpactCaseStudyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-form";
import { createImpactCaseStudyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/create-impact-case-study.action";

interface ImpactCaseStudyCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
}

export function ImpactCaseStudyCreateForm(
	props: Readonly<ImpactCaseStudyCreateFormProps>,
): ReactNode {
	const { initialAssets, relatedEntities, relatedResources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New impact case study")}</Heading>

			<ImpactCaseStudyForm
				formAction={createImpactCaseStudyAction}
				initialAssets={initialAssets}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>
		</Fragment>
	);
}
