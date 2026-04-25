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

interface WorkingGroupReportStepNavProps {
	reportId: string;
}

export function WorkingGroupReportStepNav(
	props: Readonly<WorkingGroupReportStepNavProps>,
): ReactNode {
	const { reportId } = props;

	const t = useExtracted();
	const pathname = usePathname();

	const base = `/dashboard/reporting/working-group-reports/${reportId}/edit`;

	const steps: Array<Step> = [
		{ href: `${base}/data`, label: t("Data") },
		{ href: `${base}/events`, label: t("Events") },
		{ href: `${base}/questions`, label: t("Questions") },
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
