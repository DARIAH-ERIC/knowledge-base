"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface PersonDetailsProps {
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
}

export function PersonDetails(props: Readonly<PersonDetailsProps>): ReactNode {
	const { person } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{person.name}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{person.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Sort name")}</DescriptionTerm>
			<DescriptionDetails>{person.sortName}</DescriptionDetails>

			<DescriptionTerm>{t("Email")}</DescriptionTerm>
			<DescriptionDetails>{person.email}</DescriptionDetails>

			<DescriptionTerm>{t("ORCID")}</DescriptionTerm>
			<DescriptionDetails>{person.orcid}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				<img alt="" src={person.image.url} />
			</DescriptionDetails>
		</DescriptionList>
	);
}
