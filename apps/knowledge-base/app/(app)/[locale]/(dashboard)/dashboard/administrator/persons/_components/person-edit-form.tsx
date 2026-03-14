"use client";

import type * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/react";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { PersonForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { updatePersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.action";

interface PersonEditFormProps {
	assets: Array<{ key: string; url: string }>;
	biography?: JSONContent;
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
}

export function PersonEditForm(props: Readonly<PersonEditFormProps>): ReactNode {
	const { assets, biography, person } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit person")}</Heading>

			<PersonForm
				assets={assets}
				biography={biography}
				formAction={updatePersonAction}
				person={person}
			/>
		</Fragment>
	);
}
