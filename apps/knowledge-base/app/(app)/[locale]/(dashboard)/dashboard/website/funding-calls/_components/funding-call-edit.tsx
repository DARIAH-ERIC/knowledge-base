"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { FundingCallForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-form";
import { discardFundingCallDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/discard-funding-call-draft.action";
import { publishFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/publish-funding-call.action";
import { updateFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/update-funding-call.action";

interface FundingCallEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	fundingCall: Pick<schema.FundingCall, "id" | "duration" | "title" | "summary"> & {
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
	};
}

export function FundingCallEditForm(props: Readonly<FundingCallEditFormProps>): ReactNode {
	const { contentBlocks, documentId, hasDraftChanges, isPublished, fundingCall } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit funding call")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardFundingCallDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishFundingCallAction}
				/>
			</div>

			<FundingCallForm
				contentBlocks={contentBlocks}
				formAction={updateFundingCallAction}
				fundingCall={fundingCall}
			/>
		</Fragment>
	);
}
