"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ContributionsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/contributions-section";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { PersonForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { discardPersonDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/discard-person-draft.action";
import { publishPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/publish-person.action";
import { updatePersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.action";
import type { ContributionRoleOption, PersonContribution } from "@/lib/data/contributions";

interface PersonEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biography?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
	contributions: Array<PersonContribution>;
	contributionRoleOptions: Array<ContributionRoleOption>;
}

export function PersonEditForm(props: Readonly<PersonEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		person,
		contributions,
		contributionRoleOptions,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit person")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardPersonDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishPersonAction}
				/>
			</div>

			<PersonForm formAction={updatePersonAction} initialAssets={initialAssets} person={person} />

			<ContributionsSection
				contributions={contributions}
				personId={person.id}
				roleOptions={contributionRoleOptions}
			/>
		</Fragment>
	);
}
