/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { User } from "@dariah-eric/auth";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
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

	return db.query.reportingCampaigns.findMany({
		orderBy: { year: "desc" },
		columns: { id: true, year: true, status: true },
	});
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
