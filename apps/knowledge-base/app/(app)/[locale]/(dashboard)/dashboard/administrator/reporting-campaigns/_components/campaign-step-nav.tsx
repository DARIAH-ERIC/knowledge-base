"use client";

import { Link } from "@dariah-eric/ui/link";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import { usePathname } from "@/lib/navigation/navigation";

interface Step {
	href: string;
	label: string;
}

interface CampaignStepNavProps {
	campaignId: string;
}

export function CampaignStepNav(props: Readonly<CampaignStepNavProps>): ReactNode {
	const { campaignId } = props;

	const t = useExtracted();
	const pathname = usePathname();

	const base = `/dashboard/administrator/reporting-campaigns/${campaignId}/edit`;

	const steps: Array<Step> = [
		{ href: `${base}/settings`, label: t("Settings") },
		{ href: `${base}/events`, label: t("Events") },
		{ href: `${base}/social-media`, label: t("Social media") },
		{ href: `${base}/contributions`, label: t("Contributions") },
		{ href: `${base}/services`, label: t("Services") },
		{ href: `${base}/questions`, label: t("Questions") },
	];

	return (
		<nav aria-label={t("Campaign sections")} className="flex gap-x-1 overflow-x-auto">
			{steps.map((step) => {
				const isCurrent = pathname === step.href || pathname.startsWith(`${step.href}/`);

				return (
					<Link
						key={step.href}
						className={cn(
							"whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							isCurrent
								? "bg-primary text-primary-fg"
								: "text-muted-fg hover:bg-muted hover:text-fg",
						)}
						href={step.href}
					>
						{step.label}
					</Link>
				);
			})}
		</nav>
	);
}
