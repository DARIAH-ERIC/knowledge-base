import type { User } from "@dariah-eric/auth";
import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

const chairRoles = ["is_chair_of", "is_vice_chair_of", "is_director_of"] as const;
const coordinatorRoles = ["national_coordinator", "national_coordinator_deputy"] as const;

const relevantRoles = [
	"is_chair_of",
	"is_vice_chair_of",
	"is_director_of",
	"is_member_of",
	"national_coordinator",
	"national_coordinator_deputy",
	"national_representative",
	"national_representative_deputy",
] as const;

export interface WorkingGroupReportScope {
	reportId: string;
	workingGroupName: string;
	status: string;
	canConfirm: boolean;
}

export interface CountryReportScope {
	reportId: string;
	countryName: string;
	status: string;
	canConfirm: boolean;
}

export async function getUserReportingScope(user: User): Promise<{
	workingGroupReports: Array<WorkingGroupReportScope>;
	countryReports: Array<CountryReportScope>;
}> {
	const empty = { workingGroupReports: [], countryReports: [] };

	const openCampaign = await db.query.reportingCampaigns.findFirst({
		where: { status: "open" },
		columns: { id: true },
	});

	if (openCampaign == null) return empty;

	const wgReportItems: Array<WorkingGroupReportScope> = [];
	const countryReportItems: Array<CountryReportScope> = [];

	if (user.personId != null) {
		const { personId } = user;

		const relations = await db
			.select({
				orgUnitId: schema.personsToOrganisationalUnits.organisationalUnitId,
				orgUnitName: schema.organisationalUnits.name,
				orgUnitType: schema.organisationalUnitTypes.type,
				roleType: schema.personRoleTypes.type,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.where(
				and(
					eq(schema.personsToOrganisationalUnits.personId, personId),
					sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
					inArray(schema.organisationalUnitTypes.type, ["working_group", "country"]),
					inArray(schema.personRoleTypes.type, [...relevantRoles]),
				),
			);

		const wgOrgUnitIds = [
			...new Set(
				relations
					.filter((r) => {
						return r.orgUnitType === "working_group";
					})
					.map((r) => {
						return r.orgUnitId;
					}),
			),
		];

		if (wgOrgUnitIds.length > 0) {
			const wgReports = await db
				.select({
					id: schema.workingGroupReports.id,
					status: schema.workingGroupReports.status,
					workingGroupId: schema.workingGroupReports.workingGroupId,
				})
				.from(schema.workingGroupReports)
				.where(
					and(
						eq(schema.workingGroupReports.campaignId, openCampaign.id),
						inArray(schema.workingGroupReports.workingGroupId, wgOrgUnitIds),
					),
				);

			for (const report of wgReports) {
				const relationsForWg = relations.filter((r) => {
					return r.orgUnitId === report.workingGroupId && r.orgUnitType === "working_group";
				});
				const canConfirm = relationsForWg.some((r) => {
					return (chairRoles as ReadonlyArray<string>).includes(r.roleType);
				});
				wgReportItems.push({
					reportId: report.id,
					workingGroupName: relationsForWg[0]?.orgUnitName ?? "",
					status: report.status,
					canConfirm,
				});
			}
		}

		const countryOrgUnitIds = [
			...new Set(
				relations
					.filter((r) => {
						return r.orgUnitType === "country";
					})
					.map((r) => {
						return r.orgUnitId;
					}),
			),
		];

		if (countryOrgUnitIds.length > 0) {
			const personCountryReports = await db
				.select({
					id: schema.countryReports.id,
					status: schema.countryReports.status,
					countryId: schema.countryReports.countryId,
				})
				.from(schema.countryReports)
				.where(
					and(
						eq(schema.countryReports.campaignId, openCampaign.id),
						inArray(schema.countryReports.countryId, countryOrgUnitIds),
					),
				);

			for (const report of personCountryReports) {
				const relationsForCountry = relations.filter((r) => {
					return r.orgUnitId === report.countryId && r.orgUnitType === "country";
				});
				const canConfirm = relationsForCountry.some((r) => {
					return (coordinatorRoles as ReadonlyArray<string>).includes(r.roleType);
				});
				countryReportItems.push({
					reportId: report.id,
					countryName: relationsForCountry[0]?.orgUnitName ?? "",
					status: report.status,
					canConfirm,
				});
			}
		}
	}

	if (user.organisationalUnitId != null) {
		const report = await db.query.countryReports.findFirst({
			where: { campaignId: openCampaign.id, countryId: user.organisationalUnitId },
			columns: { id: true, status: true },
		});

		if (report != null) {
			const alreadyIncluded = countryReportItems.some((r) => {
				return r.reportId === report.id;
			});
			if (!alreadyIncluded) {
				const country = await db.query.organisationalUnits.findFirst({
					where: { id: user.organisationalUnitId },
					columns: { name: true },
				});
				countryReportItems.push({
					reportId: report.id,
					countryName: country?.name ?? "",
					status: report.status,
					canConfirm: false,
				});
			}
		}
	}

	return {
		workingGroupReports: wgReportItems,
		countryReports: countryReportItems,
	};
}
