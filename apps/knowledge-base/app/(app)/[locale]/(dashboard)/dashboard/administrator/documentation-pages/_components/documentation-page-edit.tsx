"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { DocumentationPageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-form";
import { discardDocumentationPageDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/discard-documentation-page-draft.action";
import { publishDocumentationPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/publish-documentation-page.action";
import { updateDocumentationPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_lib/update-documentation-page.action";

interface DocumentationPageEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	documentationPage: Pick<schema.DocumentationPage, "id" | "title"> & {
		entityVersion: { entity: Pick<schema.Entity, "id" | "slug"> };
	};
	hasDraftChanges: boolean;
	isPublished: boolean;
}

export function DocumentationPageEditForm(
	props: Readonly<DocumentationPageEditFormProps>,
): ReactNode {
	const { contentBlocks, documentId, documentationPage, hasDraftChanges, isPublished } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit documentation page")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardDocumentationPageDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishDocumentationPageAction}
				/>
			</div>
			<DocumentationPageForm
				contentBlocks={contentBlocks}
				documentationPage={documentationPage}
				formAction={updateDocumentationPageAction}
			/>
		</Fragment>
	);
}
