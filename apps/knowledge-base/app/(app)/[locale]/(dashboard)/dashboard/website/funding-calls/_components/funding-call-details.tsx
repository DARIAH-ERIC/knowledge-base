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

interface FundingCallDetailsProps {
	contentBlocks: Array<ContentBlock>;
	fundingCall: Pick<schema.FundingCall, "id" | "duration" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string } };
	};
}

export function FundingCallDetails(props: Readonly<FundingCallDetailsProps>): ReactNode {
	const { contentBlocks, fundingCall } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex justify-end">
				<Link
					className={buttonStyles({ intent: "secondary", size: "sm" })}
					href={`/dashboard/website/funding-calls/${fundingCall.entityVersion.entity.slug}/edit`}
				>
					<PencilSquareIcon className="mr-2 size-4" />
					{t("Edit")}
				</Link>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{fundingCall.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{fundingCall.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{fundingCall.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
