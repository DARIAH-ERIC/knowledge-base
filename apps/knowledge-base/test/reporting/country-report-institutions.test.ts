import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import {
	getCountryReportInstitutionRows,
	groupCountryReportInstitutionSummaryRows,
} from "@/lib/data/country-report-institutions";
import { createDraftDocument, createPublishedDocument } from "@/lib/data/entity-lifecycle";
import type { Transaction } from "@/lib/db";
import { max } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

describe("country report institutions", () => {
	it("lists an institution once with all captured representation types", () => {
		const institutions = groupCountryReportInstitutionSummaryRows([
			{
				id: "row-1",
				organisationalUnitDocumentId: "institution-1",
				representationType: "is_national_representative_institution_in",
				organisationalUnit: { name: "Austrian Academy of Sciences", acronym: "OEAW" },
			},
			{
				id: "row-2",
				organisationalUnitDocumentId: "institution-1",
				representationType: "is_national_coordinating_institution_in",
				organisationalUnit: { name: "Austrian Academy of Sciences", acronym: "OEAW" },
			},
			{
				id: "row-3",
				organisationalUnitDocumentId: "institution-1",
				representationType: "is_national_representative_institution_in",
				organisationalUnit: { name: "Austrian Academy of Sciences", acronym: "OEAW" },
			},
		]);

		expect(institutions).toEqual([
			{
				id: "row-1",
				name: "Austrian Academy of Sciences",
				acronym: "OEAW",
				isDraft: false,
				representationTypes: [
					"is_national_coordinating_institution_in",
					"is_national_representative_institution_in",
				],
			},
		]);
	});
});

describe("country report institution rows", () => {
	async function seedInstitution(tx: Transaction, name: string, isDraft: boolean): Promise<string> {
		const [entityType, unitType] = await Promise.all([
			tx.query.entityTypes.findFirst({
				where: { type: "organisational_units" },
				columns: { id: true },
			}),
			tx.query.organisationalUnitTypes.findFirst({
				where: { type: "institution" },
				columns: { id: true },
			}),
		]);
		assert(entityType);
		assert(unitType);

		const create = isDraft ? createDraftDocument : createPublishedDocument;
		const { documentId, versionId } = await create(
			tx,
			entityType.id,
			`test-institution-${randomUUID()}`,
		);
		await tx
			.insert(schema.organisationalUnits)
			.values({ id: versionId, name, typeId: unitType.id });
		return documentId;
	}

	it("names institutions that are still draft-only, and flags them as drafts", async () => {
		await withTransaction(async (tx) => {
			const draft = await seedInstitution(tx, "Draft Institution", true);
			const published = await seedInstitution(tx, "Published Institution", false);
			const country = await seedInstitution(tx, "Test Country", false);

			// `reporting_campaigns.year` is unique; one past the highest year in use cannot clash.
			const [latest] = await tx
				.select({ year: max(schema.reportingCampaigns.year) })
				.from(schema.reportingCampaigns);
			const [campaign] = await tx
				.insert(schema.reportingCampaigns)
				.values({ year: (latest?.year ?? 0) + 1 })
				.returning({ id: schema.reportingCampaigns.id });
			assert(campaign);
			const [report] = await tx
				.insert(schema.countryReports)
				.values({ campaignId: campaign.id, countryDocumentId: country })
				.returning({ id: schema.countryReports.id });
			assert(report);

			await tx.insert(schema.countryReportInstitutions).values([
				{
					countryReportId: report.id,
					organisationalUnitDocumentId: draft,
					representationType: "is_partner_institution_of",
				},
				{
					countryReportId: report.id,
					organisationalUnitDocumentId: published,
					representationType: "is_partner_institution_of",
				},
			]);

			const rows = await getCountryReportInstitutionRows(report.id, tx);
			const names = new Map(
				rows.map((row) => [row.organisationalUnitDocumentId, row.organisationalUnit?.name]),
			);
			expect(names.get(draft)).toBe("Draft Institution");
			expect(names.get(published)).toBe("Published Institution");

			const isDraft = new Map(
				rows.map((row) => [row.organisationalUnitDocumentId, row.organisationalUnit?.isDraft]),
			);
			expect(isDraft.get(draft)).toBe(true);
			expect(isDraft.get(published)).toBe(false);
		});
	});
});
