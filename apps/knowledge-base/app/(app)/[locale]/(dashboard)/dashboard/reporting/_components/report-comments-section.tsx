import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { RichTextView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/rich-text-view";
import { ReportScreenCommentForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-form";
import { ReportSummarySection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-summary-section";
import {
	type ReportScreenCommentKey,
	type ReportScreenCommentType,
	type ReportScreenCommentView,
	getReportScreenCommentKeys,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_lib/report-screen-comments";

export const reportCommentsSectionId = "report-comments";

interface ReportCommentsSectionProps {
	comments: ReadonlyArray<ReportScreenCommentView>;
	/**
	 * When set, every screen's comment is shown as an editable form, so reporters can keep adding
	 * comments once the report is submitted and the edit forms are closed to them.
	 */
	editable?: { reportId: string; reportType: ReportScreenCommentType };
}

export async function ReportCommentsSection(
	props: Readonly<ReportCommentsSectionProps>,
): Promise<ReactNode> {
	const { comments, editable } = props;

	if (comments.length === 0 && editable == null) {
		return null;
	}

	const t = await getExtracted();
	const labels: Record<ReportScreenCommentKey, string> = {
		institutions: t("Partner institutions"),
		contributors: t("Contributors"),
		events: t("Events"),
		"social-media": t("Social media"),
		services: t("Services"),
		software: t("SSHOC resources"),
		publications: t("Publications"),
		projects: t("Projects"),
		data: t("Data"),
		questions: t("Questions"),
		confirm: t("Summary"),
	};
	const commentsByScreenKey = new Map(comments.map((item) => [item.screenKey, item.comment]));

	return (
		<ReportSummarySection
			className="mbs-0"
			contentClassName="gap-y-6"
			id={reportCommentsSectionId}
			title={t("Comments")}
		>
			{editable != null
				? getReportScreenCommentKeys(editable.reportType).map((screenKey) => (
						<ReportScreenCommentForm
							key={screenKey}
							comment={commentsByScreenKey.get(screenKey) ?? null}
							reportId={editable.reportId}
							reportType={editable.reportType}
							screenKey={screenKey}
							title={labels[screenKey]}
						/>
					))
				: comments.map((item) => (
						<div key={item.screenKey} className="flex flex-col gap-y-2">
							<h3 className="text-sm font-medium text-fg">{labels[item.screenKey]}</h3>
							<div className="rounded-md border border-border px-4 py-3">
								<RichTextView content={item.comment} size="sm" />
							</div>
						</div>
					))}
		</ReportSummarySection>
	);
}
