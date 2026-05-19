"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
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
	lifecycle: {
		person: { documentId: string; hasDraftChanges: boolean; isPublished: boolean };
		organisationalUnit: { documentId: string; hasDraftChanges: boolean; isPublished: boolean };
	};
	roleOptions: Array<ContributionRoleOption>;
}

export function ContributionEditForm(props: Readonly<ContributionEditFormProps>): ReactNode {
	const { contribution, lifecycle, roleOptions } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between gap-x-4">
				<Heading>{t("Edit person relation")}</Heading>
				<div className="flex flex-wrap justify-end gap-2">
					<EntityLifecycleBar
						documentId={lifecycle.person.documentId}
						hasDraft={lifecycle.person.hasDraftChanges}
						isPublished={lifecycle.person.isPublished}
					/>
					<EntityLifecycleBar
						documentId={lifecycle.organisationalUnit.documentId}
						hasDraft={lifecycle.organisationalUnit.hasDraftChanges}
						isPublished={lifecycle.organisationalUnit.isPublished}
					/>
				</div>
			</div>

			<ContributionForm
				description={t("Update the person-to-organisation relation.")}
				formAction={updateContributionAction}
				roleOptions={roleOptions}
				showSaveAndPublish={true}
				values={contribution}
			/>
		</Fragment>
	);
}
