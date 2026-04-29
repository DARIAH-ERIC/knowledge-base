"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { DocumentationPageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-form";
import { updateDocumentationPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/update-documentation-page.action";

interface DocumentationPageEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentationPage: Pick<schema.DocumentationPage, "id" | "title"> & {
		entity: Pick<schema.Entity, "documentId" | "slug">;
	};
}

export function DocumentationPageEditForm(
	props: Readonly<DocumentationPageEditFormProps>,
): ReactNode {
	const { contentBlocks, documentationPage } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit documentation page")}</Heading>
			<DocumentationPageForm
				contentBlocks={contentBlocks}
				documentationPage={documentationPage}
				formAction={updateDocumentationPageAction}
			/>
		</Fragment>
	);
}
