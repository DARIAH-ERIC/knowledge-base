import {
	reportingCampaignContributionRoleEnum,
	reportingCampaignEventTypeEnum,
	reportingCampaignSocialMediaCategoryEnum,
	serviceSizeEnum,
} from "@dariah-eric/database/schema";
import * as schema from "@dariah-eric/database/schema";

import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { getDariahEricDocumentId } from "@/lib/data/unit-relations";
import { type Database, type Transaction, db } from "@/lib/db";
import { type SQL, and, eq, exists, inArray, sql } from "@/lib/db/sql";
import {
	type ServiceSizeWithVisitsThreshold,
	getUnorderedVisitsThresholds,
	serviceSizesWithVisitsThreshold,
} from "@/lib/service-visits-thresholds";

export interface ReportingCampaignReadiness {
	/** Lump sums the operational cost calculation needs; a missing one silently counts as zero. */
	missing: {
		eventTypes: Array<(typeof reportingCampaignEventTypeEnum)[number]>;
		socialMediaCategories: Array<(typeof reportingCampaignSocialMediaCategoryEnum)[number]>;
		contributionRoles: Array<(typeof reportingCampaignContributionRoleEnum)[number]>;
		serviceSizes: Array<(typeof serviceSizeEnum)[number]>;
		visitsThresholds: Array<ServiceSizeWithVisitsThreshold>;
	};
	/**
	 * Sizes whose visits threshold is not above the next smaller size's. Sizes are matched by
	 * threshold, not by name, so out of order they would be billed as the wrong size.
	 */
	unorderedVisitsThresholds: Array<ServiceSizeWithVisitsThreshold>;
	/** Countries that get a country report when the campaign is launched. */
	countryCount: number;
	countriesWithoutThreshold: number;
	/** Working groups that get a working group report when the campaign is launched. */
	workingGroupCount: number;
	questionCount: number;
	/**
	 * Whether every required amount is set and the visits thresholds increase. Country thresholds and
	 * questions only warn.
	 */
	isReady: boolean;
}

/** Matches unit relations whose duration overlaps the calendar year `year`. */
function overlapsYear(year: number) {
	return sql`
		${schema.organisationalUnitsRelations.duration} && tstzrange (
			MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
			MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
		)
	`;
}

/**
 * Published organisational units of `type`, keyed by document id, with a relation matching
 * `relation`.
 */
function selectPublishedUnitsWithRelation(
	queryDb: Database | Transaction,
	type: "country" | "working_group",
	relation: SQL | undefined,
) {
	const matchingRelation = queryDb
		.select({ id: schema.organisationalUnitsRelations.id })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.unitDocumentId, schema.entityVersions.entityId),
				relation,
			),
		);

	return queryDb
		.select({ id: schema.entityVersions.entityId, name: schema.organisationalUnits.name })
		.from(schema.organisationalUnits)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				publishedEntityVersionWhere(),
				eq(schema.organisationalUnitTypes.type, type),
				exists(matchingRelation),
			),
		)
		.orderBy(schema.organisationalUnits.name);
}

/**
 * Published countries that were a member or observer of DARIAH at any time during the campaign
 * `year`, keyed by document id (which is what campaign thresholds reference). Only these countries
 * file country reports.
 */
export async function getReportingCountries(
	year: number,
	queryDb: Database | Transaction = db,
): Promise<Array<{ id: string; name: string }>> {
	return selectPublishedUnitsWithRelation(
		queryDb,
		"country",
		and(
			inArray(schema.organisationalUnitStatus.status, ["is_member_of", "is_observer_of"]),
			overlapsYear(year),
		),
	);
}

/**
 * Published working groups that were part of DARIAH at any time during the campaign `year`, keyed
 * by document id. Only these working groups file working group reports.
 */
export async function getReportingWorkingGroups(
	year: number,
	queryDb: Database | Transaction = db,
): Promise<Array<{ id: string; name: string }>> {
	const ericDocumentId = await getDariahEricDocumentId(queryDb);
	if (ericDocumentId == null) {
		return [];
	}

	return selectPublishedUnitsWithRelation(
		queryDb,
		"working_group",
		and(
			eq(schema.organisationalUnitStatus.status, "is_part_of"),
			eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, ericDocumentId),
			overlapsYear(year),
		),
	);
}

/**
 * Checks whether a campaign is configured well enough to open for reporting. Callers must have
 * authorised the user already.
 */
export async function getReportingCampaignReadiness(
	campaignId: string,
): Promise<ReportingCampaignReadiness | null> {
	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id: campaignId },
		columns: { id: true, year: true },
		with: {
			eventAmounts: { columns: { eventType: true } },
			socialMediaAmounts: { columns: { category: true } },
			contributionAmounts: { columns: { roleType: true } },
			serviceSizes: { columns: { serviceSize: true, visitsThreshold: true } },
			countryThresholds: { columns: { countryDocumentId: true } },
			workingGroupReportQuestions: { columns: { id: true } },
		},
	});

	if (campaign == null) {
		return null;
	}

	const [countries, workingGroups] = await Promise.all([
		getReportingCountries(campaign.year),
		getReportingWorkingGroups(campaign.year),
	]);

	const eventTypes = new Set(campaign.eventAmounts.map((row) => row.eventType));
	const socialMediaCategories = new Set(campaign.socialMediaAmounts.map((row) => row.category));
	const contributionRoles = new Set(campaign.contributionAmounts.map((row) => row.roleType));
	const serviceSizes = new Map(
		campaign.serviceSizes.map((row) => [row.serviceSize, row.visitsThreshold]),
	);
	const countriesWithThreshold = new Set(
		campaign.countryThresholds.map((row) => row.countryDocumentId),
	);

	const missing: ReportingCampaignReadiness["missing"] = {
		eventTypes: reportingCampaignEventTypeEnum.filter((key) => !eventTypes.has(key)),
		socialMediaCategories: reportingCampaignSocialMediaCategoryEnum.filter(
			(key) => !socialMediaCategories.has(key),
		),
		contributionRoles: reportingCampaignContributionRoleEnum.filter(
			(key) => !contributionRoles.has(key),
		),
		serviceSizes: serviceSizeEnum.filter((key) => !serviceSizes.has(key)),
		visitsThresholds: serviceSizesWithVisitsThreshold.filter(
			(key) => serviceSizes.get(key) == null,
		),
	};

	const unorderedVisitsThresholds = getUnorderedVisitsThresholds(serviceSizes);

	return {
		missing,
		unorderedVisitsThresholds,
		countryCount: countries.length,
		countriesWithoutThreshold: countries.filter(
			(country) => !countriesWithThreshold.has(country.id),
		).length,
		workingGroupCount: workingGroups.length,
		questionCount: campaign.workingGroupReportQuestions.length,
		isReady:
			Object.values(missing).every((keys) => keys.length === 0) &&
			unorderedVisitsThresholds.length === 0,
	};
}
