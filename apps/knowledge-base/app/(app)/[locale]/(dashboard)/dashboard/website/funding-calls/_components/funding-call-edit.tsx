"use client";

import type { ImageCaptionMode } from "@dariah-eric/database/image-captions";
import type * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import type { SelectedImage } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/image-select-field";
import { FundingCallForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-form";
import { discardFundingCallDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/discard-funding-call-draft.action";
import { publishFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/publish-funding-call.action";
import { updateFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/update-funding-call.action";

interface FundingCallEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	initialAssets: Array<{ key: string; label: string; url: string }>;
	isPublished: boolean;
	fundingCall: Pick<schema.FundingCall, "id" | "duration" | "title" | "summary"> & {
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
	} & {
		image: SelectedImage;
		imageCaption: JSONContent | null;
		imageCaptionMode: ImageCaptionMode;
	};
}

export function FundingCallEditForm(props: Readonly<FundingCallEditFormProps>): ReactNode {
	const { contentBlocks, documentId, hasDraftChanges, initialAssets, isPublished, fundingCall } =
		props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader
				title={t("Edit funding call")}
				lifecycle={{
					documentId,
					hasDraft: hasDraftChanges,
					isPublished,
					publishAction: publishFundingCallAction,
					discardDraftAction: discardFundingCallDraftAction,
				}}
			/>

			<FundingCallForm
				contentBlocks={contentBlocks}
				initialAssets={initialAssets}
				isPublished={isPublished}
				formAction={updateFundingCallAction}
				fundingCall={fundingCall}
			/>
		</Fragment>
	);
}
