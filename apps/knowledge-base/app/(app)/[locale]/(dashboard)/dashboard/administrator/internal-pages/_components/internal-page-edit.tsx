"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { InternalPageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_components/internal-page-form";
import { discardInternalPageDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_lib/discard-internal-page-draft.action";
import { publishInternalPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_lib/publish-internal-page.action";
import { updateInternalPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_lib/update-internal-page.action";

interface InternalPageEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	internalPage: Pick<schema.InternalPage, "id" | "title"> & {
		entityVersion: { entity: Pick<schema.Entity, "id" | "slug"> };
	};
	isPublished: boolean;
}

export function InternalPageEditForm(props: Readonly<InternalPageEditFormProps>): ReactNode {
	const { contentBlocks, documentId, hasDraftChanges, internalPage, isPublished } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit internal page")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardInternalPageDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishInternalPageAction}
				/>
			</div>
			<InternalPageForm
				contentBlocks={contentBlocks}
				formAction={updateInternalPageAction}
				internalPage={internalPage}
			/>
		</Fragment>
	);
}
