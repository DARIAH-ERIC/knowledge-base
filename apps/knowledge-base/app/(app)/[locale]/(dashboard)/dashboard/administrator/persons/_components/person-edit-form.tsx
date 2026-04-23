"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ContributionsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/contributions-section";
import { PersonForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { updatePersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.action";
import type { ContributionRoleOption, PersonContribution } from "@/lib/data/contributions";

interface PersonEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "position" | "sortName"> & {
		biography?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	contributions: Array<PersonContribution>;
	contributionRoleOptions: Array<ContributionRoleOption>;
}

export function PersonEditForm(props: Readonly<PersonEditFormProps>): ReactNode {
	const { initialAssets, person, contributions, contributionRoleOptions } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit person")}</Heading>

			<PersonForm formAction={updatePersonAction} initialAssets={initialAssets} person={person} />

			<ContributionsSection
				contributions={contributions}
				personId={person.id}
				roleOptions={contributionRoleOptions}
			/>
		</Fragment>
	);
}
