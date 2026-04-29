"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DocumentationPageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-form";
import { createDocumentationPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/create-documentation-page.action";

export function DocumentationPageCreateForm(): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New documentation page")}</Heading>
			<DocumentationPageForm formAction={createDocumentationPageAction} />
		</Fragment>
	);
}
