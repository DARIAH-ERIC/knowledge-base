"use client";

import type * as schema from "@dariah-eric/database/schema";
import { buttonStyles } from "@dariah-eric/ui/button";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { Link } from "@dariah-eric/ui/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";

interface DocumentOrPolicyDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentOrPolicy: Pick<schema.DocumentOrPolicy, "id" | "title" | "summary" | "url"> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { document: { key: string; label: string; url: string; downloadUrl: string } };
}

export function DocumentOrPolicyDetails(props: Readonly<DocumentOrPolicyDetailsProps>): ReactNode {
	const { contentBlocks, documentOrPolicy } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex justify-end">
				<Link
					className={buttonStyles({ intent: "secondary", size: "sm" })}
					href={`/dashboard/website/documents-policies/${documentOrPolicy.entityVersion.entity.slug}/edit`}
				>
					<PencilSquareIcon className="mr-2 size-4" />
					{t("Edit")}
				</Link>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Title")}</DescriptionTerm>
				<DescriptionDetails>{documentOrPolicy.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{documentOrPolicy.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{documentOrPolicy.summary}</DescriptionDetails>

				{documentOrPolicy.url != null ? (
					<>
						<DescriptionTerm>{t("URL")}</DescriptionTerm>
						<DescriptionDetails>{documentOrPolicy.url}</DescriptionDetails>
					</>
				) : null}

				<DescriptionTerm>{t("Document")}</DescriptionTerm>
				<DescriptionDetails>
					<a
						className="underline"
						download={documentOrPolicy.document.label}
						href={documentOrPolicy.document.downloadUrl}
					>
						{documentOrPolicy.document.label}
					</a>
				</DescriptionDetails>

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
