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

interface CountryReportStepNavProps {
	reportId: string;
}

export function CountryReportStepNav(props: Readonly<CountryReportStepNavProps>): ReactNode {
	const { reportId } = props;

	const t = useExtracted();
	const pathname = usePathname();

	const base = `/dashboard/reporting/country-reports/${reportId}/edit`;

	const steps: Array<Step> = [
		{ href: `${base}/institutions`, label: t("Institutions") },
		{ href: `${base}/contributors`, label: t("Contributors") },
		{ href: `${base}/events`, label: t("Events") },
		{ href: `${base}/social-media`, label: t("Social media") },
		{ href: `${base}/services`, label: t("Services") },
		{ href: `${base}/software`, label: t("Software") },
		{ href: `${base}/publications`, label: t("Publications") },
		{ href: `${base}/projects`, label: t("Projects") },
		{ href: `${base}/confirm`, label: t("Confirm") },
	];

	return (
		<nav aria-label={t("Report sections")} className="flex gap-x-1 overflow-x-auto">
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
