"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { updateContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-contribution.action";
import { ContributionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-form";
import type { ContributionRoleOption } from "@/lib/data/contributions";

interface ContributionEditFormProps {
	contribution: {
		id: string;
		person: { id: string; name: string };
		roleTypeId: string;
		organisationalUnit: { id: string; name: string };
		durationStart: string;
		durationEnd: string | null;
	};
	roleOptions: Array<ContributionRoleOption>;
}

export function ContributionEditForm(props: Readonly<ContributionEditFormProps>): ReactNode {
	const { contribution, roleOptions } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit person relation")}</Heading>

			<ContributionForm
				description={t("Update the person-to-organisation relation.")}
				formAction={updateContributionAction}
				roleOptions={roleOptions}
				values={contribution}
			/>
		</Fragment>
	);
}
