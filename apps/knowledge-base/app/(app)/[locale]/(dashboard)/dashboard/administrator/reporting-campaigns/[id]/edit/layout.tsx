import { db } from "@dariah-eric/database/client";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { CampaignStepNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-step-nav";
import { assertAdmin } from "@/lib/auth/session";

interface CampaignEditLayoutProps {
	children: ReactNode;
	params: Promise<{ locale: string; id: string }>;
}

export default async function CampaignEditLayout(
	props: Readonly<CampaignEditLayoutProps>,
): Promise<ReactNode> {
	const { children, params } = props;

	const { id } = await params;

	const [campaign] = await Promise.all([
		db.query.reportingCampaigns.findFirst({
			where: { id },
			columns: { id: true, year: true },
		}),
		assertAdmin(),
	]);

	if (campaign == null) {
		notFound();
	}

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{"Campaign"}</HeaderTitle>
					<HeaderDescription>{campaign.year}</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-6 px-(--layout-padding) pt-6">
				<CampaignStepNav campaignId={id} />
				{children}
			</div>
		</div>
	);
}
