/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { User } from "@dariah-eric/auth";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

export interface ReportingStatisticsOverview {
	campaignCount: number;
	totalCountryReports: number;
	totalWorkingGroupReports: number;
	totalContributors: number;
	totalCountryEvents: number;
	totalWorkingGroupEvents: number;
	totalProjectContributions: number;
}

export interface ReportingStatisticsCampaignSummary {
	id: string;
	year: number;
	status: string;
	countryDraftCount: number;
	countrySubmittedCount: number;
	countryAcceptedCount: number;
	workingGroupDraftCount: number;
	workingGroupSubmittedCount: number;
	workingGroupAcceptedCount: number;
	totalContributors: number;
	totalCountryEvents: number;
	totalInstitutions: number;
	totalServices: number;
	totalProjectContributions: number;
	totalWorkingGroupMembers: number;
	totalWorkingGroupEvents: number;
}

export interface ReportingStatisticsCountryTrend {
	campaignYear: number;
	countryName: string;
	status: string;
	totalContributors: number;
	totalEvents: number;
	institutions: number;
	services: number;
	projectContributions: number;
	contributorsDelta: number | null;
	eventsDelta: number | null;
	projectContributionsDelta: number | null;
}

export interface ReportingStatisticsWorkingGroupYearSummary {
	campaignYear: number;
	reportCount: number;
	draftCount: number;
	submittedCount: number;
	acceptedCount: number;
	totalMembers: number;
	totalEvents: number;
	organiserEvents: number;
	presenterEvents: number;
	socialMediaAccounts: number;
}

export interface ReportingStatisticsData {
	overview: ReportingStatisticsOverview;
	campaignSummaries: Array<ReportingStatisticsCampaignSummary>;
	countryTrends: Array<ReportingStatisticsCountryTrend>;
	workingGroupYearSummaries: Array<ReportingStatisticsWorkingGroupYearSummary>;
}

export async function getCountryReportsForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	return db.query.countryReports.findMany({
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { id: true, year: true } },
			country: { columns: { id: true, name: true } },
		},
	});
}

export async function getCountryReportForAdmin(currentUser: Pick<User, "role">, id: string) {
	assertAdminUser(currentUser);

	return db.query.countryReports.findFirst({
		where: { id },
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { year: true } },
			country: { columns: { name: true } },
		},
	});
}

export async function getCountryReportCreateDataForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	const [campaigns, countries] = await Promise.all([
		db.query.reportingCampaigns.findMany({
			where: { status: "open" },
			orderBy: { year: "desc" },
			columns: { id: true, year: true },
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "country" } },
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
	]);

	return { campaigns, countries };
}

export async function getWorkingGroupReportsForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	return db.query.workingGroupReports.findMany({
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { id: true, year: true } },
			workingGroup: { columns: { id: true, name: true } },
		},
	});
}

export async function getWorkingGroupReportForAdmin(currentUser: Pick<User, "role">, id: string) {
	assertAdminUser(currentUser);

	return db.query.workingGroupReports.findFirst({
		where: { id },
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { year: true } },
			workingGroup: { columns: { name: true } },
		},
	});
}

export async function getWorkingGroupReportCreateDataForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	const [campaigns, workingGroups] = await Promise.all([
		db.query.reportingCampaigns.findMany({
			where: { status: "open" },
			orderBy: { year: "desc" },
			columns: { id: true, year: true },
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "working_group" } },
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
	]);

	return { campaigns, workingGroups };
}

export async function getReportingCampaignsForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	const campaigns = await db.query.reportingCampaigns.findMany({
		orderBy: { year: "desc" },
		columns: { id: true, year: true, status: true },
		with: {
			countryReports: {
				columns: { id: true },
			},
			workingGroupReports: {
				columns: { id: true },
			},
		},
	});

	return campaigns.map((campaign) => {
		const reportCount = campaign.countryReports.length + campaign.workingGroupReports.length;

		return {
			id: campaign.id,
			year: campaign.year,
			status: campaign.status,
			reportCount,
			hasReports: reportCount > 0,
		};
	});
}

export async function getReportingStatisticsForAdmin(
	currentUser: Pick<User, "role">,
): Promise<ReportingStatisticsData> {
	assertAdminUser(currentUser);

	const campaigns = await db.query.reportingCampaigns.findMany({
		orderBy: { year: "desc" },
		columns: { id: true, year: true, status: true },
		with: {
			countryReports: {
				columns: {
					id: true,
					status: true,
					totalContributors: true,
					smallEvents: true,
					mediumEvents: true,
					largeEvents: true,
					veryLargeEvents: true,
				},
				with: {
					country: { columns: { name: true } },
					institutions: { columns: { id: true } },
					serviceKpis: { columns: { serviceId: true } },
					projectContributions: { columns: { amountEuros: true } },
				},
			},
			workingGroupReports: {
				columns: {
					id: true,
					status: true,
					numberOfMembers: true,
				},
				with: {
					events: { columns: { id: true, role: true } },
					socialMedia: { columns: { id: true } },
				},
			},
		},
	});

	const overview: ReportingStatisticsOverview = {
		campaignCount: campaigns.length,
		totalCountryReports: 0,
		totalWorkingGroupReports: 0,
		totalContributors: 0,
		totalCountryEvents: 0,
		totalWorkingGroupEvents: 0,
		totalProjectContributions: 0,
	};

	const campaignSummaries: Array<ReportingStatisticsCampaignSummary> = [];
	const countryTrendBaseRows: Array<Omit<
		ReportingStatisticsCountryTrend,
		"contributorsDelta" | "eventsDelta" | "projectContributionsDelta"
	>> = [];
	const workingGroupYearSummaries: Array<ReportingStatisticsWorkingGroupYearSummary> = [];

	for (const campaign of campaigns) {
		let countryDraftCount = 0;
		let countrySubmittedCount = 0;
		let countryAcceptedCount = 0;
		let workingGroupDraftCount = 0;
		let workingGroupSubmittedCount = 0;
		let workingGroupAcceptedCount = 0;
		let totalContributors = 0;
		let totalCountryEvents = 0;
		let totalInstitutions = 0;
		let totalServices = 0;
		let totalProjectContributions = 0;
		let totalWorkingGroupMembers = 0;
		let totalWorkingGroupEvents = 0;
		let organiserEvents = 0;
		let presenterEvents = 0;
		let socialMediaAccounts = 0;

		for (const report of campaign.countryReports) {
			if (report.status === "draft") countryDraftCount += 1;
			if (report.status === "submitted") countrySubmittedCount += 1;
			if (report.status === "accepted") countryAcceptedCount += 1;

			const contributors = report.totalContributors ?? 0;
			const events =
				(report.smallEvents ?? 0) +
				(report.mediumEvents ?? 0) +
				(report.largeEvents ?? 0) +
				(report.veryLargeEvents ?? 0);
			const institutions = report.institutions.length;
			const services = new Set(
				report.serviceKpis.map((serviceKpi) => {
					return serviceKpi.serviceId;
				}),
			).size;
			const projectContributions = report.projectContributions.reduce((sum, contribution) => {
				return sum + contribution.amountEuros;
			}, 0);

			totalContributors += contributors;
			totalCountryEvents += events;
			totalInstitutions += institutions;
			totalServices += services;
			totalProjectContributions += projectContributions;

			countryTrendBaseRows.push({
				campaignYear: campaign.year,
				countryName: report.country.name,
				status: report.status,
				totalContributors: contributors,
				totalEvents: events,
				institutions,
				services,
				projectContributions,
			});
		}

		for (const report of campaign.workingGroupReports) {
			if (report.status === "draft") workingGroupDraftCount += 1;
			if (report.status === "submitted") workingGroupSubmittedCount += 1;
			if (report.status === "accepted") workingGroupAcceptedCount += 1;

			totalWorkingGroupMembers += report.numberOfMembers ?? 0;
			totalWorkingGroupEvents += report.events.length;
			socialMediaAccounts += report.socialMedia.length;

			for (const event of report.events) {
				if (event.role === "organiser") organiserEvents += 1;
				if (event.role === "presenter") presenterEvents += 1;
			}
		}

		overview.totalCountryReports += campaign.countryReports.length;
		overview.totalWorkingGroupReports += campaign.workingGroupReports.length;
		overview.totalContributors += totalContributors;
		overview.totalCountryEvents += totalCountryEvents;
		overview.totalWorkingGroupEvents += totalWorkingGroupEvents;
		overview.totalProjectContributions += totalProjectContributions;

		campaignSummaries.push({
			id: campaign.id,
			year: campaign.year,
			status: campaign.status,
			countryDraftCount,
			countrySubmittedCount,
			countryAcceptedCount,
			workingGroupDraftCount,
			workingGroupSubmittedCount,
			workingGroupAcceptedCount,
			totalContributors,
			totalCountryEvents,
			totalInstitutions,
			totalServices,
			totalProjectContributions,
			totalWorkingGroupMembers,
			totalWorkingGroupEvents,
		});

		workingGroupYearSummaries.push({
			campaignYear: campaign.year,
			reportCount: campaign.workingGroupReports.length,
			draftCount: workingGroupDraftCount,
			submittedCount: workingGroupSubmittedCount,
			acceptedCount: workingGroupAcceptedCount,
			totalMembers: totalWorkingGroupMembers,
			totalEvents: totalWorkingGroupEvents,
			organiserEvents,
			presenterEvents,
			socialMediaAccounts,
		});
	}

	const countryRowsByName = new Map<
		string,
		Array<(typeof countryTrendBaseRows)[number]>
	>();

	for (const row of countryTrendBaseRows) {
		const rows = countryRowsByName.get(row.countryName) ?? [];
		rows.push(row);
		countryRowsByName.set(row.countryName, rows);
	}

	const countryTrends = Array.from(countryRowsByName.entries())
		.sort(([left], [right]) => {
			return left.localeCompare(right);
		})
		.flatMap(([, rows]) => {
			const sortedRows = rows.slice().sort((left, right) => {
				return left.campaignYear - right.campaignYear;
			});

			return sortedRows
				.map((row, index) => {
					const previousRow = sortedRows[index - 1];

					return {
						...row,
						contributorsDelta:
							previousRow != null ? row.totalContributors - previousRow.totalContributors : null,
						eventsDelta: previousRow != null ? row.totalEvents - previousRow.totalEvents : null,
						projectContributionsDelta:
							previousRow != null
								? row.projectContributions - previousRow.projectContributions
								: null,
					};
				})
				.toReversed();
		});

	return {
		overview,
		campaignSummaries,
		countryTrends,
		workingGroupYearSummaries,
	};
}

export async function getReportingCampaignHeaderForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true, year: true },
	});
}

export async function getReportingCampaignSettingsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true, year: true, status: true },
	});
}

export async function getReportingCampaignEventAmountsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			eventAmounts: {
				columns: { eventType: true, amount: true },
			},
		},
	});
}

export async function getReportingCampaignCountryThresholdsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	const [campaign, countries] = await Promise.all([
		db.query.reportingCampaigns.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				countryThresholds: {
					columns: { countryId: true, amount: true },
				},
			},
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "country" } },
			columns: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
	]);

	return { campaign, countries };
}

export async function getReportingCampaignContributionAmountsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			contributionAmounts: {
				columns: { roleType: true, amount: true },
			},
		},
	});
}

export async function getReportingCampaignQuestionsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			workingGroupReportQuestions: {
				columns: { id: true, question: true, position: true },
				orderBy: { position: "asc" },
			},
		},
	});
}

export async function getReportingCampaignServiceSizesForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			serviceSizes: {
				columns: { serviceSize: true, visitsThreshold: true, amount: true },
			},
		},
	});
}

export async function getReportingCampaignSocialMediaAmountsForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
) {
	assertAdminUser(currentUser);

	return db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			socialMediaAmounts: {
				columns: { category: true, amount: true },
			},
		},
	});
}
