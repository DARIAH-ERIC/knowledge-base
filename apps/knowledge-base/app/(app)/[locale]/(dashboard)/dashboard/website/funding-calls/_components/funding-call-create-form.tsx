"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { FundingCallForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-form";
import { createFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/create-funding-call.action";

export function FundingCallCreateForm(): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New funding call")}</Heading>

			<FundingCallForm formAction={createFundingCallAction} />
		</Fragment>
	);
}
