import {
	reportingCampaignContributionRoleEnum,
	reportingCampaignEventTypeEnum,
	reportingCampaignSocialMediaCategoryEnum,
	serviceSizeEnum,
} from "@dariah-eric/database/schema";
import * as schema from "@dariah-eric/database/schema";

import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

/** Service sizes matched by visit count; "small" is the floor, so it needs no threshold. */
const serviceSizesRequiringVisitsThreshold = ["medium", "large", "very_large"] as const;

export interface ReportingCampaignReadiness {
	/** Lump sums the operational cost calculation needs; a missing one silently counts as zero. */
	missing: {
		eventTypes: Array<(typeof reportingCampaignEventTypeEnum)[number]>;
		socialMediaCategories: Array<(typeof reportingCampaignSocialMediaCategoryEnum)[number]>;
		contributionRoles: Array<(typeof reportingCampaignContributionRoleEnum)[number]>;
		serviceSizes: Array<(typeof serviceSizeEnum)[number]>;
		visitsThresholds: Array<(typeof serviceSizesRequiringVisitsThreshold)[number]>;
	};
	countryCount: number;
	countriesWithoutThreshold: number;
	questionCount: number;
	/** Whether every required amount is set. Country thresholds and questions only warn. */
	isReady: boolean;
}

/** Published countries, keyed by document id (which is what campaign thresholds reference). */
export async function getPublishedCountries(): Promise<Array<{ id: string; name: string }>> {
	return db
		.select({ id: schema.entityVersions.entityId, name: schema.organisationalUnits.name })
		.from(schema.organisationalUnits)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(and(publishedEntityVersionWhere(), eq(schema.organisationalUnitTypes.type, "country")))
		.orderBy(schema.organisationalUnits.name);
}

/**
 * Checks whether a campaign is configured well enough to open for reporting. Callers must have
 * authorised the user already.
 */
export async function getReportingCampaignReadiness(
	campaignId: string,
): Promise<ReportingCampaignReadiness | null> {
	const [campaign, countries] = await Promise.all([
		db.query.reportingCampaigns.findFirst({
			where: { id: campaignId },
			columns: { id: true },
			with: {
				eventAmounts: { columns: { eventType: true } },
				socialMediaAmounts: { columns: { category: true } },
				contributionAmounts: { columns: { roleType: true } },
				serviceSizes: { columns: { serviceSize: true, visitsThreshold: true } },
				countryThresholds: { columns: { countryDocumentId: true } },
				workingGroupReportQuestions: { columns: { id: true } },
			},
		}),
		getPublishedCountries(),
	]);

	if (campaign == null) {
		return null;
	}

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
		visitsThresholds: serviceSizesRequiringVisitsThreshold.filter(
			(key) => serviceSizes.has(key) && serviceSizes.get(key) == null,
		),
	};

	return {
		missing,
		countryCount: countries.length,
		countriesWithoutThreshold: countries.filter(
			(country) => !countriesWithThreshold.has(country.id),
		).length,
		questionCount: campaign.workingGroupReportQuestions.length,
		isReady: Object.values(missing).every((keys) => keys.length === 0),
	};
}
