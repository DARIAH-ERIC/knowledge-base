import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import {
	getCountryReportProjectContributionRows,
	isCountryReportProjectOption,
} from "@/lib/data/country-report-projects";
import { createDraftDocument, createPublishedDocument } from "@/lib/data/entity-lifecycle";
import type { Transaction } from "@/lib/db";
import { max } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

describe("country report projects", () => {
	async function seedProject(tx: Transaction, name: string, isDraft: boolean): Promise<string> {
		const [entityType, scope] = await Promise.all([
			tx.query.entityTypes.findFirst({ where: { type: "projects" }, columns: { id: true } }),
			tx.query.projectScopes.findFirst({ columns: { id: true } }),
		]);
		assert(entityType);
		assert(scope);

		const create = isDraft ? createDraftDocument : createPublishedDocument;
		const { documentId, versionId } = await create(
			tx,
			entityType.id,
			`test-project-${randomUUID()}`,
		);
		await tx.insert(schema.projects).values({
			id: versionId,
			name,
			scopeId: scope.id,
			duration: { start: new Date(Date.UTC(2020, 0, 1)) },
		});
		return documentId;
	}

	async function seedCountry(tx: Transaction): Promise<string> {
		const [entityType, unitType] = await Promise.all([
			tx.query.entityTypes.findFirst({
				where: { type: "organisational_units" },
				columns: { id: true },
			}),
			tx.query.organisationalUnitTypes.findFirst({
				where: { type: "country" },
				columns: { id: true },
			}),
		]);
		assert(entityType);
		assert(unitType);

		const { documentId, versionId } = await createPublishedDocument(
			tx,
			entityType.id,
			`test-country-${randomUUID()}`,
		);
		await tx
			.insert(schema.organisationalUnits)
			.values({ id: versionId, name: "Test Country", typeId: unitType.id });
		return documentId;
	}

	it("offers draft-only projects for a contribution", async () => {
		await withTransaction(async (tx) => {
			const draft = await seedProject(tx, "Draft Project", true);
			const published = await seedProject(tx, "Published Project", false);

			expect(await isCountryReportProjectOption(draft, tx)).toBe(true);
			expect(await isCountryReportProjectOption(published, tx)).toBe(true);
			expect(await isCountryReportProjectOption(randomUUID(), tx)).toBe(false);
		});
	});

	it("names contributions to draft-only projects, and flags them as drafts", async () => {
		await withTransaction(async (tx) => {
			const draft = await seedProject(tx, "Draft Project", true);
			const published = await seedProject(tx, "Published Project", false);
			const country = await seedCountry(tx);

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

			await tx.insert(schema.countryReportProjectContributions).values([
				{ countryReportId: report.id, projectDocumentId: draft, amountEuros: 1000 },
				{ countryReportId: report.id, projectDocumentId: published, amountEuros: 2000 },
			]);

			const rows = await getCountryReportProjectContributionRows(report.id, tx);
			const projects = new Map(rows.map((row) => [row.projectDocumentId, row.project]));
			expect(projects.get(draft)).toMatchObject({ name: "Draft Project", isDraft: true });
			expect(projects.get(published)).toMatchObject({ name: "Published Project", isDraft: false });
		});
	});
});
