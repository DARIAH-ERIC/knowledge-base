import { ButtonLink } from "@dariah-eric/ui/button-link";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface ReportHistoryListItem {
	id: string;
	title: string;
	description: string;
	href: string;
	/** `null` when the report can no longer be edited. */
	editHref: string | null;
}

interface ReportHistoryListProps {
	className?: string;
	items: ReadonlyArray<ReportHistoryListItem>;
}

export function formatReportStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Mirrors `isReportEditable` (lib/auth/permissions): admins always; otherwise only while the report
 * is a `draft` and its campaign is `open`.
 */
export function isReportHistoryItemEditable(
	report: Readonly<{ reportStatus: string; campaignStatus: string }>,
	isAdmin = false,
): boolean {
	return isAdmin || (report.reportStatus === "draft" && report.campaignStatus === "open");
}

export async function ReportHistoryList(
	props: Readonly<ReportHistoryListProps>,
): Promise<ReactNode> {
	const { className, items } = props;

	const t = await getExtracted();

	return (
		<ul className={twMerge("divide-y rounded-lg border", className)}>
			{items.map((item) => (
				<li key={item.id} className="flex items-center justify-between gap-x-4 px-4 py-3">
					<div className="flex flex-col gap-y-0.5">
						<span className="text-sm font-medium">{item.title}</span>
						<span className="text-xs text-muted-fg">{item.description}</span>
					</div>
					<div className="flex items-center gap-x-2">
						<ButtonLink href={item.href} intent="plain" size="sm">
							{t("View")}
						</ButtonLink>
						{item.editHref != null ? (
							<ButtonLink href={item.editHref} intent="plain" size="sm">
								{t("Edit")}
							</ButtonLink>
						) : null}
					</div>
				</li>
			))}
		</ul>
	);
}
