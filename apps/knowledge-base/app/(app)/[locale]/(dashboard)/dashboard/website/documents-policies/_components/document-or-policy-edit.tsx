"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { DocumentOrPolicyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-form";
import { discardDocumentOrPolicyDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/discard-document-or-policy-draft.action";
import { publishDocumentOrPolicyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/publish-document-or-policy.action";
import { updateDocumentOrPolicyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy.action";

interface DocumentOrPolicyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	isPublished: boolean;
	documentOrPolicy: Pick<
		schema.DocumentOrPolicy,
		"id" | "title" | "summary" | "url" | "groupId"
	> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { document: { key: string; label: string; url: string } };
	groups: Array<Pick<schema.DocumentPolicyGroup, "id" | "label">>;
}

export function DocumentOrPolicyEditForm(
	props: Readonly<DocumentOrPolicyEditFormProps>,
): ReactNode {
	const { initialAssets, contentBlocks, documentId, isPublished, documentOrPolicy, groups } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit document or policy")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardDocumentOrPolicyDraftAction}
					documentId={documentId}
					hasDraft={true}
					isPublished={isPublished}
					publishAction={publishDocumentOrPolicyAction}
				/>
			</div>

			<DocumentOrPolicyForm
				contentBlocks={contentBlocks}
				documentOrPolicy={documentOrPolicy}
				formAction={updateDocumentOrPolicyAction}
				groups={groups}
				initialAssets={initialAssets}
			/>
		</Fragment>
	);
}
