"use client";

import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { createContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.action";
import { ContributionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-form";
import type { ContributionPersonOption, ContributionRoleOption } from "@/lib/data/contributions";

interface ContributionCreateFormProps {
	initialPersons: Array<ContributionPersonOption>;
	initialPersonsTotal: number;
	roleOptions: Array<ContributionRoleOption>;
}

export function ContributionCreateForm(props: Readonly<ContributionCreateFormProps>): ReactNode {
	const { initialPersons, initialPersonsTotal, roleOptions } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader title={t("New person relation")} />

			<ContributionForm
				description={t("Create a new person-to-organisation relation.")}
				formAction={createContributionAction}
				initialPersons={initialPersons}
				initialPersonsTotal={initialPersonsTotal}
				roleOptions={roleOptions}
			/>
		</Fragment>
	);
}
