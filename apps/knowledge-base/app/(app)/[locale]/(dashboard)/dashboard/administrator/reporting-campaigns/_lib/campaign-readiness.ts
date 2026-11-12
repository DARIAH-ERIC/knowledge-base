import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import {
	type ReportingCampaignReadiness,
	getReportingCampaignReadiness,
} from "@/lib/data/reporting-campaign-readiness";
import { db } from "@/lib/db";

export interface CampaignReadinessMessages {
	/** Block opening the campaign. */
	errors: Array<string>;
	/** Shown before launch, but do not block it. */
	warnings: Array<string>;
}

export async function getCampaignReadinessMessages(
	readiness: ReportingCampaignReadiness,
): Promise<CampaignReadinessMessages> {
	const t = await getExtracted();
	const { missing } = readiness;

	const errors: Array<string> = [];
	const warnings: Array<string> = [];

	if (missing.eventTypes.length > 0) {
		errors.push(
			t("Events: {count} event amounts are missing.", { count: String(missing.eventTypes.length) }),
		);
	}
	if (missing.socialMediaCategories.length > 0) {
		errors.push(
			t("Social media: {count} amounts are missing.", {
				count: String(missing.socialMediaCategories.length),
			}),
		);
	}
	if (missing.contributionRoles.length > 0) {
		errors.push(
			t("Contributions: {count} role amounts are missing.", {
				count: String(missing.contributionRoles.length),
			}),
		);
	}
	if (missing.serviceSizes.length > 0) {
		errors.push(
			t("Services: {count} service size amounts are missing.", {
				count: String(missing.serviceSizes.length),
			}),
		);
	}
	if (missing.visitsThresholds.length > 0) {
		errors.push(
			t("Services: {count} visit thresholds are missing.", {
				count: String(missing.visitsThresholds.length),
			}),
		);
	}
	if (readiness.unorderedVisitsThresholds.length > 0) {
		errors.push(t("Services: visit thresholds must increase from small to very large."));
	}

	if (readiness.countriesWithoutThreshold > 0) {
		warnings.push(
			t(
				"Countries: {count} of {total} countries have no threshold, so their reports cannot be compared against one.",
				{
					count: String(readiness.countriesWithoutThreshold),
					total: String(readiness.countryCount),
				},
			),
		);
	}
	if (readiness.questionCount === 0) {
		warnings.push(t("Questions: working group reports will have no questions to answer."));
	}

	return { errors, warnings };
}

/**
 * Guards every path that opens a campaign: without its amounts, the operational cost of every
 * country report would silently come out as zero.
 */
export async function checkCampaignReadyToOpen(
	campaignId: string,
): Promise<ActionState | undefined> {
	const t = await getExtracted();
	const readiness = await getReportingCampaignReadiness(campaignId);

	if (readiness == null) {
		return createActionStateError({ message: t("Campaign not found.") });
	}

	if (readiness.isReady) {
		return undefined;
	}

	const { errors } = await getCampaignReadinessMessages(readiness);

	return createActionStateError({
		message: [t("The campaign cannot be opened yet."), ...errors].join(" "),
	});
}

/**
 * A closed campaign's amounts and questions are what its reports were assessed against, and the
 * operational cost is recomputed on every read, so changing them would rewrite past results.
 */
export async function checkCampaignEditable(campaignId: string): Promise<ActionState | undefined> {
	const t = await getExtracted();
	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id: campaignId },
		columns: { status: true },
	});

	if (campaign == null) {
		return createActionStateError({ message: t("Campaign not found.") });
	}

	if (campaign.status === "closed") {
		return createActionStateError({
			message: t("This campaign is closed and can no longer be changed."),
		});
	}

	return undefined;
}
