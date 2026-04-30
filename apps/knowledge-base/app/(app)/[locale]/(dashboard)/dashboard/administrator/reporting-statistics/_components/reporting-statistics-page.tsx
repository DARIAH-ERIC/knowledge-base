import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import type { ReportingStatisticsData } from "@/lib/data/admin-reporting";

interface ReportingStatisticsPageProps {
	data: ReportingStatisticsData;
}

const eurFormatter = new Intl.NumberFormat("en", {
	style: "currency",
	currency: "EUR",
	maximumFractionDigits: 0,
});

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSignedNumber(value: number | null, format: "number" | "currency" = "number"): string {
	if (value == null) return "—";

	const sign = value > 0 ? "+" : "";

	if (format === "currency") {
		return `${sign}${eurFormatter.format(value)}`;
	}

	return `${sign}${value.toLocaleString()}`;
}

export async function ReportingStatisticsPage(
	props: Readonly<ReportingStatisticsPageProps>,
): Promise<ReactNode> {
	const { data } = props;

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-8">
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Statistics")}</HeaderTitle>
					<HeaderDescription>
						{t("Review aggregate reporting data across campaigns and compare country-level changes over time.")}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-10 px-(--layout-padding)">
				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div className="rounded-lg border bg-bg p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
							{t("Campaigns")}
						</p>
						<p className="mt-2 text-2xl font-semibold text-fg">
							{data.overview.campaignCount.toLocaleString()}
						</p>
						<p className="mt-1 text-sm text-muted-fg">{t("Reporting campaigns in the system")}</p>
					</div>

					<div className="rounded-lg border bg-bg p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
							{t("Country reports")}
						</p>
						<p className="mt-2 text-2xl font-semibold text-fg">
							{data.overview.totalCountryReports.toLocaleString()}
						</p>
						<p className="mt-1 text-sm text-muted-fg">
							{t("{count} contributors reported", {
								count: data.overview.totalContributors.toLocaleString(),
							})}
						</p>
					</div>

					<div className="rounded-lg border bg-bg p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
							{t("Events")}
						</p>
						<p className="mt-2 text-2xl font-semibold text-fg">
							{(
								data.overview.totalCountryEvents + data.overview.totalWorkingGroupEvents
							).toLocaleString()}
						</p>
						<p className="mt-1 text-sm text-muted-fg">
							{t("{country} country, {workingGroups} working group", {
								country: data.overview.totalCountryEvents.toLocaleString(),
								workingGroups: data.overview.totalWorkingGroupEvents.toLocaleString(),
							})}
						</p>
					</div>

					<div className="rounded-lg border bg-bg p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
							{t("Project contributions")}
						</p>
						<p className="mt-2 text-2xl font-semibold text-fg">
							{eurFormatter.format(data.overview.totalProjectContributions)}
						</p>
						<p className="mt-1 text-sm text-muted-fg">
							{t("{count} working group reports", {
								count: data.overview.totalWorkingGroupReports.toLocaleString(),
							})}
						</p>
					</div>
				</section>

				<section className="flex flex-col gap-y-4">
					<div className="flex flex-col gap-y-1">
						<h2 className="text-sm font-semibold text-fg">{t("Campaign summary")}</h2>
						<p className="text-sm text-muted-fg">
							{t("Compare report volumes, workflow status, and aggregate activity by campaign year.")}
						</p>
					</div>

					<Table
						aria-label="campaign summary"
						className="[--gutter:0] overflow-x-auto sm:[--gutter:0]"
					>
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Year")}</TableColumn>
							<TableColumn>{t("Status")}</TableColumn>
							<TableColumn>{t("Country reports")}</TableColumn>
							<TableColumn>{t("Working group reports")}</TableColumn>
							<TableColumn>{t("Contributors")}</TableColumn>
							<TableColumn>{t("Country events")}</TableColumn>
							<TableColumn>{t("WG events")}</TableColumn>
							<TableColumn>{t("Project EUR")}</TableColumn>
						</TableHeader>
						<TableBody items={data.campaignSummaries}>
							{(item) => {
								return (
									<TableRow id={item.id}>
										<TableCell>{item.year}</TableCell>
										<TableCell>{formatStatus(item.status)}</TableCell>
										<TableCell>
											<div className="flex flex-col gap-y-0.5">
												<span>{item.countryDraftCount + item.countrySubmittedCount + item.countryAcceptedCount}</span>
													<span className="text-xs text-muted-fg">
														{t("{draft}/{submitted}/{accepted}", {
															accepted: String(item.countryAcceptedCount),
															draft: String(item.countryDraftCount),
															submitted: String(item.countrySubmittedCount),
														})}
													</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-y-0.5">
												<span>
													{item.workingGroupDraftCount +
														item.workingGroupSubmittedCount +
														item.workingGroupAcceptedCount}
												</span>
													<span className="text-xs text-muted-fg">
														{t("{draft}/{submitted}/{accepted}", {
															accepted: String(item.workingGroupAcceptedCount),
															draft: String(item.workingGroupDraftCount),
															submitted: String(item.workingGroupSubmittedCount),
														})}
													</span>
											</div>
										</TableCell>
										<TableCell>{item.totalContributors.toLocaleString()}</TableCell>
										<TableCell>{item.totalCountryEvents.toLocaleString()}</TableCell>
										<TableCell>{item.totalWorkingGroupEvents.toLocaleString()}</TableCell>
										<TableCell>{eurFormatter.format(item.totalProjectContributions)}</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				</section>

				<section className="flex flex-col gap-y-4">
					<div className="flex flex-col gap-y-1">
						<h2 className="text-sm font-semibold text-fg">{t("Country trends")}</h2>
						<p className="text-sm text-muted-fg">
							{t("Track structured country-report metrics by campaign year and compare year-over-year change.")}
						</p>
					</div>

					<Table aria-label="country trends" className="[--gutter:0] overflow-x-auto sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Country")}</TableColumn>
							<TableColumn>{t("Year")}</TableColumn>
							<TableColumn>{t("Status")}</TableColumn>
							<TableColumn>{t("Contributors")}</TableColumn>
							<TableColumn>{t("Events")}</TableColumn>
							<TableColumn>{t("Institutions")}</TableColumn>
							<TableColumn>{t("Services")}</TableColumn>
							<TableColumn>{t("Project EUR")}</TableColumn>
							<TableColumn>{t("Delta contributors")}</TableColumn>
							<TableColumn>{t("Delta events")}</TableColumn>
							<TableColumn>{t("Delta EUR")}</TableColumn>
						</TableHeader>
						<TableBody items={data.countryTrends}>
							{(item) => {
								return (
									<TableRow id={`${item.countryName}-${String(item.campaignYear)}`}>
										<TableCell>{item.countryName}</TableCell>
										<TableCell>{item.campaignYear}</TableCell>
										<TableCell>{formatStatus(item.status)}</TableCell>
										<TableCell>{item.totalContributors.toLocaleString()}</TableCell>
										<TableCell>{item.totalEvents.toLocaleString()}</TableCell>
										<TableCell>{item.institutions.toLocaleString()}</TableCell>
										<TableCell>{item.services.toLocaleString()}</TableCell>
										<TableCell>{eurFormatter.format(item.projectContributions)}</TableCell>
										<TableCell>{formatSignedNumber(item.contributorsDelta)}</TableCell>
										<TableCell>{formatSignedNumber(item.eventsDelta)}</TableCell>
										<TableCell>
											{formatSignedNumber(item.projectContributionsDelta, "currency")}
										</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				</section>

				<section className="flex flex-col gap-y-4">
					<div className="flex flex-col gap-y-1">
						<h2 className="text-sm font-semibold text-fg">{t("Working group yearly summary")}</h2>
						<p className="text-sm text-muted-fg">
							{t("Review aggregate working-group activity by campaign year without narrative answers.")}
						</p>
					</div>

					<Table
						aria-label="working group yearly summary"
						className="[--gutter:0] overflow-x-auto sm:[--gutter:0]"
					>
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Year")}</TableColumn>
							<TableColumn>{t("Reports")}</TableColumn>
							<TableColumn>{t("Status split")}</TableColumn>
							<TableColumn>{t("Members")}</TableColumn>
							<TableColumn>{t("Events")}</TableColumn>
							<TableColumn>{t("Organiser")}</TableColumn>
							<TableColumn>{t("Presenter")}</TableColumn>
							<TableColumn>{t("Social media")}</TableColumn>
						</TableHeader>
						<TableBody items={data.workingGroupYearSummaries}>
							{(item) => {
								return (
									<TableRow id={String(item.campaignYear)}>
										<TableCell>{item.campaignYear}</TableCell>
										<TableCell>{item.reportCount.toLocaleString()}</TableCell>
											<TableCell>
												{t("{draft}/{submitted}/{accepted}", {
													accepted: String(item.acceptedCount),
													draft: String(item.draftCount),
													submitted: String(item.submittedCount),
												})}
											</TableCell>
										<TableCell>{item.totalMembers.toLocaleString()}</TableCell>
										<TableCell>{item.totalEvents.toLocaleString()}</TableCell>
										<TableCell>{item.organiserEvents.toLocaleString()}</TableCell>
										<TableCell>{item.presenterEvents.toLocaleString()}</TableCell>
										<TableCell>{item.socialMediaAccounts.toLocaleString()}</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				</section>
			</div>
		</div>
	);
}
