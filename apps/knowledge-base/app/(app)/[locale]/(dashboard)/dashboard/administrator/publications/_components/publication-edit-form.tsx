"use client";

import type * as schema from "@dariah-eric/database/schema";
import type { AsyncOption } from "@dariah-eric/ui/use-async-options";
import type { ReactNode } from "react";

import { PublicationForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_components/publication-form";
import { updatePublicationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/update-publication.action";

export function PublicationEditForm(
	props: Readonly<{
		publication: schema.Publication & {
			organisationalUnitDocumentIds: Array<string>;
			selectedOrganisationalUnits: Array<AsyncOption>;
		};
		nationalConsortia: { items: Array<AsyncOption>; total: number };
		workingGroups: { items: Array<AsyncOption>; total: number };
	}>,
): ReactNode {
	return (
		<PublicationForm
			formAction={updatePublicationAction}
			initialNationalConsortia={props.nationalConsortia}
			initialWorkingGroups={props.workingGroups}
			publication={props.publication}
			selectedOrganisationalUnits={props.publication.selectedOrganisationalUnits}
		/>
	);
}
