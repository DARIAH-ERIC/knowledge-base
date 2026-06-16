import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import {
	getCountryConsortiumSlugs,
	nationalConsortiaFilter,
	searchAllResourcePages,
} from "@/lib/data/report-marketplace-resources";
import { db } from "@/lib/db";

interface CountryReportPublicationsScreenProps {
	reportId: string;
}

/** Shared "publications" screen. See {@link getAuthorizedCountryReportForUser} for authorization. */
export async function CountryReportPublicationsScreen(
	props: Readonly<CountryReportPublicationsScreenProps>,
): Promise<ReactNode> {
	const { reportId } = props;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		reportId,
		(id) =>
			db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true, countryDocumentId: true },
				with: {
					campaign: { columns: { year: true } },
				},
			}),
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const t = await getExtracted();
	const year = report.campaign.year;

	const consortiumSlugs = await getCountryConsortiumSlugs(report.countryDocumentId, year);
	const publications =
		consortiumSlugs.length === 0
			? []
			: await searchAllResourcePages({
					filterBy: `type:=publication && source:=zotero && year:=${year} && ${nationalConsortiaFilter(consortiumSlugs)}`,
					perPage: 100,
					query: "*",
					queryBy: ["label", "description", "keywords"],
					sortBy: [{ field: "label", direction: "asc" }],
				});

	return (
		<div className="flex flex-col gap-y-12">
			<div className="flex flex-col gap-y-4">
				<p className="text-sm text-muted-fg">{t("Publications from the Zotero library.")}</p>
				{consortiumSlugs.length === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("This country has no national consortium for the selected year.")}
					</p>
				) : publications.length === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("No Zotero publications found for this reporting year.")}
					</p>
				) : (
					<ul className="flex flex-col gap-y-3">
						{publications.map(({ document }) => (
							<li key={document.id} className="rounded-md border border-border p-4">
								<div className="flex flex-col gap-y-2">
									<div className="flex flex-col gap-y-1">
										{document.links[0] != null ? (
											<a
												className="text-sm font-semibold text-fg underline-offset-4 hover:underline"
												href={document.links[0]}
												rel="noreferrer"
												target="_blank"
											>
												{document.label}
											</a>
										) : (
											<p className="text-sm font-semibold text-fg">{document.label}</p>
										)}
										<p className="text-xs text-muted-fg">
											{[document.authors?.join(", "), document.year, document.kind]
												.filter(Boolean)
												.join(" · ")}
										</p>
									</div>
									{document.description !== "" ? (
										<p className="line-clamp-3 text-sm text-muted-fg">{document.description}</p>
									) : null}
									{document.pid != null ? (
										<p className="text-xs text-muted-fg">
											{t("DOI: {doi}", { doi: document.pid })}
										</p>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="country"
				screenKey="publications"
			/>
		</div>
	);
}
