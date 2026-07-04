"use client";

import type { AsyncOption } from "@dariah-eric/ui/use-async-options";
import type { ReactNode } from "react";

import { PublicationForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_components/publication-form";
import { createPublicationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/create-publication.action";

export function PublicationCreateForm(
	props: Readonly<{
		nationalConsortia: { items: Array<AsyncOption>; total: number };
		workingGroups: { items: Array<AsyncOption>; total: number };
	}>,
): ReactNode {
	return (
		<PublicationForm
			formAction={createPublicationAction}
			initialNationalConsortia={props.nationalConsortia}
			initialWorkingGroups={props.workingGroups}
		/>
	);
}
