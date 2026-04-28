"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { FundingCallForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-form";
import { updateFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/update-funding-call.action";

interface FundingCallEditFormProps {
	contentBlocks: Array<ContentBlock>;
	fundingCall: Pick<schema.FundingCall, "id" | "duration" | "title" | "summary"> & {
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
	};
}

export function FundingCallEditForm(props: Readonly<FundingCallEditFormProps>): ReactNode {
	const { contentBlocks, fundingCall } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit funding call")}</Heading>

			<FundingCallForm
				contentBlocks={contentBlocks}
				formAction={updateFundingCallAction}
				fundingCall={fundingCall}
			/>
		</Fragment>
	);
}
