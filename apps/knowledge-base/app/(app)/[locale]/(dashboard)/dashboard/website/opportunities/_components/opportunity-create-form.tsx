"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { OpportunityForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-form";
import { createOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/create-opportunity.action";

interface OpportunityCreateFormProps {
	sources: Array<Pick<schema.OpportunitySource, "id" | "source">>;
}

export function OpportunityCreateForm(props: Readonly<OpportunityCreateFormProps>): ReactNode {
	const { sources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New opportunity")}</Heading>

			<OpportunityForm formAction={createOpportunityAction} sources={sources} />
		</Fragment>
	);
}
