"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { DocumentOrPolicyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-form";
import { updateDocumentOrPolicyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy.action";

interface DocumentOrPolicyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentOrPolicy: Pick<schema.DocumentOrPolicy, "id" | "title" | "summary" | "url" | "groupId"> & {
		entity: { documentId: string; slug: string };
	} & { document: { key: string; label: string; url: string } };
	groups: Array<Pick<schema.DocumentPolicyGroup, "id" | "label">>;
}

export function DocumentOrPolicyEditForm(
	props: Readonly<DocumentOrPolicyEditFormProps>,
): ReactNode {
	const { initialAssets, contentBlocks, documentOrPolicy, groups } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit document or policy")}</Heading>

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
