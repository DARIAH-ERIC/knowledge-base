"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { PersonForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { createPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/create-person.action";

interface PersonCreateFormProps {
	assets: Array<{ key: string; url: string }>;
}

export function PersonCreateForm(props: Readonly<PersonCreateFormProps>): ReactNode {
	const { assets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New person")}</Heading>

			<PersonForm assets={assets} formAction={createPersonAction} />
		</Fragment>
	);
}
