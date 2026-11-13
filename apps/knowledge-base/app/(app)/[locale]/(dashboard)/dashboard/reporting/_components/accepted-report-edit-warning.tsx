import { Note } from "@dariah-eric/ui/note";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

interface AcceptedReportEditWarningProps {
	/** The report's status; the warning shows only for accepted reports. */
	status: string;
	/**
	 * - `admin`: the admin edit form, whose "Status" tab can send the report back.
	 * - `reporting`: the reporting edit form, which only administrators can open once a report is
	 *   accepted.
	 */
	variant: "admin" | "reporting";
}

/**
 * Warns that saving changes alters a report the office has already accepted. Administrators can
 * still edit accepted reports (reporters are redirected to the read-only report), so this guards
 * against changing approved content by accident.
 */
export async function AcceptedReportEditWarning(
	props: Readonly<AcceptedReportEditWarningProps>,
): Promise<ReactNode> {
	const { status, variant } = props;

	if (status !== "accepted") {
		return null;
	}

	const t = await getExtracted();

	return (
		<Note intent="warning">
			{variant === "admin"
				? t(
						"This report has already been accepted. Any change you save here alters the accepted report. To have the reporters revise it instead, set its status back to draft on the Status tab.",
					)
				: t(
						"This report has already been accepted. Any change you save here alters the accepted report. To have the reporters revise it instead, set its status back to draft in the administrator dashboard.",
					)}
		</Note>
	);
}
