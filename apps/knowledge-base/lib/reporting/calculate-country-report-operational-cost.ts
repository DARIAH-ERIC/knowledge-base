import type {
	ReportingCampaignContributionAmount,
	ReportingCampaignEventAmount,
	ReportingCampaignServiceSize,
	ReportingCampaignSocialMediaAmount,
} from "@dariah-eric/database/schema";

type EventAmountByType = Pick<ReportingCampaignEventAmount, "eventType" | "amount">;
type ServiceSizeAmount = Pick<
	ReportingCampaignServiceSize,
	"serviceSize" | "visitsThreshold" | "amount"
>;
type SocialMediaAmountByCategory = Pick<ReportingCampaignSocialMediaAmount, "category" | "amount">;
type CampaignContributionRoleType = ReportingCampaignContributionAmount["roleType"];
type OrganisationalUnitType = "governance_body" | "working_group" | (string & {});

export const countryReportOperationalCostContributionTypeEnum = [
	"national_coordinator",
	"national_coordinator_deputy",
	"is_chair_of_jrc",
	"is_chair_of_wg",
	"is_member_of_jrc",
	"is_chair_of_ncc",
] as const;

export type CountryReportOperationalCostContributionType =
	(typeof countryReportOperationalCostContributionTypeEnum)[number];

export interface CountryReportOperationalCostEventInput {
	smallEvents: number | null | undefined;
	mediumEvents: number | null | undefined;
	largeEvents: number | null | undefined;
	veryLargeEvents: number | null | undefined;
	dariahCommissionedEvent: string | null | undefined;
}

export interface CountryReportOperationalCostInput {
	events: CountryReportOperationalCostEventInput;
	eventAmounts: Array<EventAmountByType>;
	services: Array<CountryReportOperationalCostServiceInput>;
	serviceSizes: Array<ServiceSizeAmount>;
	socialMedia: Array<CountryReportOperationalCostSocialMediaInput>;
	socialMediaAmounts: Array<SocialMediaAmountByCategory>;
	contributions: Array<CountryReportOperationalCostContributionInput>;
	contributionAmounts: Array<CountryReportOperationalCostContributionAmount>;
}

export interface CountryReportOperationalCostServiceInput {
	serviceType: string | null | undefined;
	kpis: Array<{ kpi: string; value: number }>;
}

export interface CountryReportOperationalCostSocialMediaInput {
	socialMediaType: string | null | undefined;
}

export interface CountryReportOperationalCostContributionInput {
	roleType: string | null | undefined;
	organisationalUnitType: OrganisationalUnitType | null | undefined;
	organisationalUnitName: string | null | undefined;
	organisationalUnitAcronym: string | null | undefined;
}

export interface CountryReportOperationalCostContributionAmount {
	roleType: CampaignContributionRoleType;
	amount: number;
}

function getEventAmountMap(eventAmounts: Array<EventAmountByType>) {
	return new Map(
		eventAmounts.map((eventAmount) => {
			return [eventAmount.eventType, eventAmount.amount] as const;
		}),
	);
}

function getServiceSizeMap(serviceSizes: Array<ServiceSizeAmount>) {
	return new Map(
		serviceSizes.map((serviceSize) => {
			return [serviceSize.serviceSize, serviceSize] as const;
		}),
	);
}

function getSocialMediaAmountMap(socialMediaAmounts: Array<SocialMediaAmountByCategory>) {
	return new Map(
		socialMediaAmounts.map((socialMediaAmount) => {
			return [socialMediaAmount.category, socialMediaAmount.amount] as const;
		}),
	);
}

function getContributionAmountMap(
	contributionAmounts: Array<CountryReportOperationalCostContributionAmount>,
) {
	return new Map(
		contributionAmounts.map((contributionAmount) => {
			return [contributionAmount.roleType, contributionAmount.amount] as const;
		}),
	);
}

function getServiceVisits(kpis: Array<{ kpi: string; value: number }>): number | null {
	const visitsKpi = kpis.find((kpi) => {
		return kpi.kpi === "visits";
	});

	return visitsKpi?.value ?? null;
}

function matchesGovernanceBody(
	contribution: CountryReportOperationalCostContributionInput,
	expected: "JRC" | "NCC",
): boolean {
	if (contribution.organisationalUnitType !== "governance_body") {
		return false;
	}

	const acronym = contribution.organisationalUnitAcronym?.trim().toUpperCase();
	const name = contribution.organisationalUnitName?.trim().toUpperCase();

	return acronym === expected || name === expected;
}

export function getCountryReportOperationalCostContributionType(
	contribution: CountryReportOperationalCostContributionInput,
): CountryReportOperationalCostContributionType | null {
	// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
	switch (contribution.roleType) {
		case "national_coordinator": {
			return "national_coordinator";
		}

		case "national_coordinator_deputy": {
			return "national_coordinator_deputy";
		}

		case "is_member_of": {
			if (matchesGovernanceBody(contribution, "JRC")) {
				return "is_member_of_jrc";
			}

			return null;
		}

		case "is_chair_of": {
			if (contribution.organisationalUnitType === "working_group") {
				return "is_chair_of_wg";
			}

			if (matchesGovernanceBody(contribution, "JRC")) {
				return "is_chair_of_jrc";
			}

			if (matchesGovernanceBody(contribution, "NCC")) {
				return "is_chair_of_ncc";
			}

			return null;
		}

		case "is_vice_chair_of": {
			if (contribution.organisationalUnitType === "working_group") {
				return "is_chair_of_wg";
			}

			if (matchesGovernanceBody(contribution, "JRC")) {
				return "is_chair_of_jrc";
			}

			if (matchesGovernanceBody(contribution, "NCC")) {
				return "is_chair_of_ncc";
			}

			return null;
		}

		default: {
			return null;
		}
	}
}

export function getCountryReportServiceOperationalCostSize(
	service: CountryReportOperationalCostServiceInput,
	serviceSizes: Array<ServiceSizeAmount>,
): ReportingCampaignServiceSize["serviceSize"] {
	if (service.serviceType === "core") {
		return "core";
	}

	const visits = getServiceVisits(service.kpis);
	if (visits == null) {
		return "small";
	}

	const sizeByType = getServiceSizeMap(serviceSizes);

	if (visits >= (sizeByType.get("large")?.visitsThreshold ?? Number.POSITIVE_INFINITY)) {
		return "large";
	}

	if (visits >= (sizeByType.get("medium")?.visitsThreshold ?? Number.POSITIVE_INFINITY)) {
		return "medium";
	}

	if (visits >= (sizeByType.get("small")?.visitsThreshold ?? Number.POSITIVE_INFINITY)) {
		return "small";
	}

	return "small";
}

export function calculateCountryReportEventOperationalCostAmount(
	input: CountryReportOperationalCostEventInput,
	eventAmounts: Array<EventAmountByType>,
): number {
	const amountByType = getEventAmountMap(eventAmounts);

	const dariahCommissionedEvents =
		input.dariahCommissionedEvent != null && input.dariahCommissionedEvent.trim() !== "" ? 1 : 0;

	return (
		(input.smallEvents ?? 0) * (amountByType.get("small") ?? 0) +
		(input.mediumEvents ?? 0) * (amountByType.get("medium") ?? 0) +
		(input.largeEvents ?? 0) * (amountByType.get("large") ?? 0) +
		(input.veryLargeEvents ?? 0) * (amountByType.get("very_large") ?? 0) +
		dariahCommissionedEvents * (amountByType.get("dariah_commissioned") ?? 0)
	);
}

export function calculateCountryReportServiceOperationalCostAmount(
	services: Array<CountryReportOperationalCostServiceInput>,
	serviceSizes: Array<ServiceSizeAmount>,
): number {
	const amountBySize = getServiceSizeMap(serviceSizes);

	return services.reduce((total, service) => {
		const size = getCountryReportServiceOperationalCostSize(service, serviceSizes);
		return total + (amountBySize.get(size)?.amount ?? 0);
	}, 0);
}

export function calculateCountryReportSocialMediaOperationalCostAmount(
	socialMedia: Array<CountryReportOperationalCostSocialMediaInput>,
	socialMediaAmounts: Array<SocialMediaAmountByCategory>,
): number {
	const amountByCategory = getSocialMediaAmountMap(socialMediaAmounts);

	const hasWebsite = socialMedia.some((account) => {
		return account.socialMediaType === "website";
	});

	const hasOther = socialMedia.some((account) => {
		return account.socialMediaType != null && account.socialMediaType !== "website";
	});

	return (
		(hasWebsite ? (amountByCategory.get("website") ?? 0) : 0) +
		(hasOther ? (amountByCategory.get("other") ?? 0) : 0)
	);
}

export function calculateCountryReportContributionOperationalCostAmount(
	contributions: Array<CountryReportOperationalCostContributionInput>,
	contributionAmounts: Array<CountryReportOperationalCostContributionAmount>,
): number {
	const amountByContributionType = getContributionAmountMap(contributionAmounts);

	return contributions.reduce((total, contribution) => {
		const contributionType = getCountryReportOperationalCostContributionType(contribution);

		if (contributionType == null) {
			return total;
		}

		return total + (amountByContributionType.get(contributionType) ?? 0);
	}, 0);
}

export function calculateCountryReportOperationalCostAmount(
	input: CountryReportOperationalCostInput,
): number {
	return (
		calculateCountryReportEventOperationalCostAmount(input.events, input.eventAmounts) +
		calculateCountryReportServiceOperationalCostAmount(input.services, input.serviceSizes) +
		calculateCountryReportSocialMediaOperationalCostAmount(
			input.socialMedia,
			input.socialMediaAmounts,
		) +
		calculateCountryReportContributionOperationalCostAmount(
			input.contributions,
			input.contributionAmounts,
		)
	);
}
