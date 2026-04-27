import type { NextRequest } from "next/server";

import { getWorkingGroupReportData } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { getCurrentSession } from "@/lib/auth/session";
import { getUserAllWorkingGroupReports } from "@/lib/data/reporting";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<Response> {
	const { session, user } = await getCurrentSession();

	if (session == null) {
		return new Response(null, { status: 401 });
	}

	const { id } = await params;

	if (user.role !== "admin") {
		const userReports = await getUserAllWorkingGroupReports(user);
		const hasAccess = userReports.some((r) => {
			return r.reportId === id;
		});
		if (!hasAccess) {
			return new Response(null, { status: 403 });
		}
	}

	const report = await getWorkingGroupReportData(id);

	if (report == null) {
		return new Response(null, { status: 404 });
	}

	const payload = {
		id: report.id,
		status: report.status,
		workingGroup: report.workingGroup.name,
		campaign: report.campaign.year,
		numberOfMembers: report.summary.numberOfMembers,
		mailingList: report.summary.mailingList,
		chairs: report.summary.chairs.map((c) => {
			return { name: c.personName, role: c.roleType };
		}),
		socialMedia: report.summary.socialMedia.map((s) => {
			return { name: s.socialMedia.name, url: s.socialMedia.url };
		}),
		events: report.summary.events.map((e) => {
			return { title: e.title, date: e.date, url: e.url, role: e.role };
		}),
		questions: report.summary.questions.map((q) => {
			return { question: q.question, answer: q.answer };
		}),
	};

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			"Content-Disposition": `attachment; filename="working-group-report-${id}.json"`,
			"Content-Type": "application/json",
		},
	});
}
