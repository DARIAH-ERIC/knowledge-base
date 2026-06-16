"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateCountryReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_lib/create-country-report.schema";
import {
	getCarriedOverManualContributions,
	getSnapshotContributionCandidates,
} from "@/lib/data/report-contributions";
import { getCarriedOverReportSocialMedia } from "@/lib/data/report-social-media";
import { getCurrentPartnerInstitutions } from "@/lib/data/unit-relations";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createCountryReportAction = createMutationAction({
	schema: CreateCountryReportActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "country_reports" },
	revalidate: "/[locale]/dashboard/administrator/country-reports",
	redirect: "/dashboard/administrator/country-reports",

	async preCheck({ input }) {
		const t = await getExtracted();

		const campaign = await db.query.reportingCampaigns.findFirst({
			where: { id: input.campaignId },
			columns: { status: true },
		});

		if (campaign?.status !== "open") {
			return createActionStateError({
				message: t("Only open campaigns can be used for new reports."),
			});
		}

		const existing = await db.query.countryReports.findFirst({
			// input.countryId is the country's document id.
			where: { campaignId: input.campaignId, countryDocumentId: input.countryId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A report for this country and campaign already exists."),
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		const [created] = await tx
			.insert(schema.countryReports)
			.values({
				campaignId: input.campaignId,
				countryDocumentId: input.countryId,
				status: input.status,
			})
			.returning({ id: schema.countryReports.id });

		assert(created);

		// Seed the (frozen) institutions snapshot from the country's current partner institutions for
		// the campaign year. Editing the live relations happens on the institution/country screens; the
		// report tab only re-captures this snapshot.
		const campaign = await tx.query.reportingCampaigns.findFirst({
			where: { id: input.campaignId },
			columns: { year: true },
		});

		if (campaign != null) {
			const partners = await getCurrentPartnerInstitutions(input.countryId, campaign.year);

			if (partners.length > 0) {
				await tx.insert(schema.countryReportInstitutions).values(
					partners.map((partner) => {
						return {
							countryReportId: created.id,
							organisationalUnitDocumentId: partner.institutionDocumentId,
							representationType: partner.representationType,
						};
					}),
				);
			}

			// Seed contributions: Section 1 (coordinator/deputy) snapshotted from current relations, plus
			// Section 2 (cross-cutting) carried over from last year's report where still active.
			const snapshotContributions = await getSnapshotContributionCandidates(
				input.countryId,
				campaign.year,
			);

			const previousCampaign = await tx.query.reportingCampaigns.findFirst({
				where: { year: campaign.year - 1 },
				columns: { id: true },
			});
			const previousReport =
				previousCampaign == null
					? null
					: await tx.query.countryReports.findFirst({
							where: { campaignId: previousCampaign.id, countryDocumentId: input.countryId },
							columns: { id: true },
						});
			const carriedContributions =
				previousReport == null
					? []
					: await getCarriedOverManualContributions(previousReport.id, campaign.year);

			// Dedupe by personToOrgUnitId (the report's unique key for a contribution).
			const seen = new Set<string>();
			const contributionRows = [
				...snapshotContributions.map((contribution) => {
					return {
						countryReportId: created.id,
						personToOrgUnitId: contribution.personToOrgUnitId,
						contributionRole: contribution.compensationRole,
					};
				}),
				...carriedContributions.map((contribution) => {
					return {
						countryReportId: created.id,
						personToOrgUnitId: contribution.personToOrgUnitId,
						contributionRole: contribution.contributionRole,
					};
				}),
			].filter((row) => {
				if (seen.has(row.personToOrgUnitId)) {
					return false;
				}
				seen.add(row.personToOrgUnitId);
				return true;
			});

			if (contributionRows.length > 0) {
				await tx.insert(schema.countryReportContributions).values(contributionRows);
			}

			// Carry over the social media coverage set from last year's report (accounts only; KPI values
			// are re-entered each year).
			const carriedSocialMediaIds =
				previousReport == null ? [] : await getCarriedOverReportSocialMedia(previousReport.id);

			if (carriedSocialMediaIds.length > 0) {
				await tx.insert(schema.countryReportSocialMedia).values(
					carriedSocialMediaIds.map((socialMediaId) => {
						return { countryReportId: created.id, socialMediaId };
					}),
				);
			}
		}

		return { subjectId: created.id };
	},
});
