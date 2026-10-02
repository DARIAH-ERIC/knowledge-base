import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import { createPublishedDocument } from "@/lib/data/entity-lifecycle";
import { mergeEntities } from "@/lib/data/entity-merge";
import type { Transaction } from "@/lib/db";
import { eq, sql } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

type Tx = Transaction;

async function getProjectTypeId(tx: Tx): Promise<string> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "projects" },
		columns: { id: true },
	});
	assert(type, "projects entity type not found in database");
	return type.id;
}

async function getProjectRoleId(tx: Tx): Promise<string> {
	const role = await tx.query.projectRoles.findFirst({ columns: { id: true } });
	assert(role, "no project_roles seeded in database");
	return role.id;
}

async function getPersonTypeId(tx: Tx): Promise<string> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "persons" },
		columns: { id: true },
	});
	assert(type, "persons entity type not found in database");
	return type.id;
}

async function getPersonRoleTypeId(tx: Tx): Promise<string> {
	const role = await tx.query.personRoleTypes.findFirst({ columns: { id: true } });
	assert(role, "no person_role_types seeded in database");
	return role.id;
}

/** Insert a bare entity document to act as an FK target (e.g. a project↔unit relation endpoint). */
async function createBareEntity(tx: Tx, typeId: string): Promise<string> {
	const [row] = await tx
		.insert(schema.entities)
		.values({ slug: `merge-test-${randomUUID()}`, typeId })
		.returning({ id: schema.entities.id });
	assert(row);
	return row.id;
}

async function countProjectUnits(tx: Tx, projectDocumentId: string): Promise<number> {
	return tx
		.select({ n: sql<number>`count(*)::int` })
		.from(schema.projectsToOrganisationalUnits)
		.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, projectDocumentId))
		.then((r) => r[0]?.n ?? 0);
}

describe("mergeEntities", () => {
	it("re-points project→unit relations onto the target, deduping collisions, and deletes the source", async () => {
		await withTransaction(async (tx) => {
			const typeId = await getProjectTypeId(tx);
			const roleId = await getProjectRoleId(tx);

			const source = await createPublishedDocument(tx, typeId, `merge-src-${randomUUID()}`);
			const target = await createPublishedDocument(tx, typeId, `merge-tgt-${randomUUID()}`);
			const unitA = await createBareEntity(tx, typeId);
			const unitB = await createBareEntity(tx, typeId);

			await tx.insert(schema.projectsToOrganisationalUnits).values([
				{ projectDocumentId: source.documentId, unitDocumentId: unitA, roleId },
				{ projectDocumentId: source.documentId, unitDocumentId: unitB, roleId },
				// Target already relates to unitA with the same role — the incoming source row collides.
				{ projectDocumentId: target.documentId, unitDocumentId: unitA, roleId },
			]);

			await mergeEntities(tx, source.documentId, target.documentId);

			// Source document is fully gone.
			expect(
				await tx.query.entities.findFirst({ where: { id: source.documentId } }),
			).toBeUndefined();
			expect(
				await tx
					.select({ id: schema.entityVersions.id })
					.from(schema.entityVersions)
					.where(eq(schema.entityVersions.entityId, source.documentId)),
			).toHaveLength(0);
			expect(await countProjectUnits(tx, source.documentId)).toBe(0);

			// Target keeps the distinct union of (unit, role) — unitA deduped, unitB moved.
			const units = await tx
				.select({ unit: schema.projectsToOrganisationalUnits.unitDocumentId })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, target.documentId));
			expect(units.map((u) => u.unit).toSorted()).toStrictEqual([unitA, unitB].toSorted());
		});
	});

	it("dedupes without erroring when every incoming relation collides with the target", async () => {
		await withTransaction(async (tx) => {
			const typeId = await getProjectTypeId(tx);
			const roleId = await getProjectRoleId(tx);

			const source = await createPublishedDocument(tx, typeId, `merge-src-${randomUUID()}`);
			const target = await createPublishedDocument(tx, typeId, `merge-tgt-${randomUUID()}`);
			const unitA = await createBareEntity(tx, typeId);
			const unitB = await createBareEntity(tx, typeId);

			await tx.insert(schema.projectsToOrganisationalUnits).values([
				{ projectDocumentId: source.documentId, unitDocumentId: unitA, roleId },
				{ projectDocumentId: source.documentId, unitDocumentId: unitB, roleId },
				// Target already holds a copy of every source relation → all collide.
				{ projectDocumentId: target.documentId, unitDocumentId: unitA, roleId },
				{ projectDocumentId: target.documentId, unitDocumentId: unitB, roleId },
			]);

			const targetBefore = await countProjectUnits(tx, target.documentId);

			await mergeEntities(tx, source.documentId, target.documentId);

			expect(await countProjectUnits(tx, target.documentId)).toBe(targetBefore);
			expect(
				await tx.query.entities.findFirst({ where: { id: source.documentId } }),
			).toBeUndefined();
		});
	});

	it("re-points self-referential entities_to_entities on both endpoints, dropping self-relations and dedup", async () => {
		await withTransaction(async (tx) => {
			const typeId = await getProjectTypeId(tx);

			const sourceId = await createBareEntity(tx, typeId);
			const targetId = await createBareEntity(tx, typeId);
			const otherId = await createBareEntity(tx, typeId);

			await tx.insert(schema.entitiesToEntities).values([
				{ entityId: sourceId, relatedEntityId: otherId, position: 0 }, // → (target, other)
				{ entityId: otherId, relatedEntityId: sourceId, position: 0 }, // → (other, target)
				{ entityId: sourceId, relatedEntityId: targetId, position: 0 }, // self-loop → dropped
				{ entityId: targetId, relatedEntityId: otherId, position: 0 }, // collides with (target, other)
			]);

			await mergeEntities(tx, sourceId, targetId);

			const rows = await tx
				.select({
					entityId: schema.entitiesToEntities.entityId,
					relatedEntityId: schema.entitiesToEntities.relatedEntityId,
				})
				.from(schema.entitiesToEntities)
				.where(
					sql`${schema.entitiesToEntities.entityId} in (${sourceId}, ${targetId}, ${otherId})
						or ${schema.entitiesToEntities.relatedEntityId} in (${sourceId}, ${targetId}, ${otherId})`,
				);

			const pairs = rows.map((r) => `${r.entityId}->${r.relatedEntityId}`).toSorted();

			// No row references the deleted source; (target,other) deduped to one; (other,target) moved;
			// the (source,target) self-loop is gone.
			expect(pairs).toStrictEqual(
				[`${otherId}->${targetId}`, `${targetId}->${otherId}`].toSorted(),
			);

			const sourceEntity = await tx.query.entities.findFirst({ where: { id: sourceId } });
			expect(sourceEntity).toBeUndefined();
		});
	});

	it("re-points the report rows of an overlapping person↔org relation onto the relation it duplicates", async () => {
		await withTransaction(async (tx) => {
			const { source, target, sourceRelationId, targetRelationId, workingGroupReportId } =
				await createOverlappingPersonRelations(tx);

			// A working group report names the duplicate (source) relation as a chair. Reports are never
			// changed by deleting what they point to, so the chair must follow onto the target relation.
			await tx.insert(schema.workingGroupReportChairs).values({
				workingGroupReportId,
				personToOrgUnitId: sourceRelationId,
				chairRole: "is_chair_of",
			});

			const result = await mergeEntities(tx, source, target);

			expect(await tx.query.entities.findFirst({ where: { id: source } })).toBeUndefined();
			// The chair now points at the target's relation; the report still lists the person.
			expect(
				await tx
					.select({ personToOrgUnitId: schema.workingGroupReportChairs.personToOrgUnitId })
					.from(schema.workingGroupReportChairs)
					.where(eq(schema.workingGroupReportChairs.workingGroupReportId, workingGroupReportId)),
			).toStrictEqual([{ personToOrgUnitId: targetRelationId }]);
			// Target keeps exactly its own single relation to the org.
			expect(
				await tx
					.select({ id: schema.personsToOrganisationalUnits.id })
					.from(schema.personsToOrganisationalUnits)
					.where(eq(schema.personsToOrganisationalUnits.personDocumentId, target)),
			).toHaveLength(1);
			expect(result.summary).toMatchObject({
				persons_to_organisational_units: 1,
				working_group_report_chairs: 1,
			});
		});
	});

	it("keeps a single report row when the report already lists the relation the duplicate is merged into", async () => {
		await withTransaction(async (tx) => {
			const { source, target, sourceRelationId, targetRelationId, workingGroupReportId } =
				await createOverlappingPersonRelations(tx);

			await tx.insert(schema.workingGroupReportChairs).values([
				{ workingGroupReportId, personToOrgUnitId: sourceRelationId, chairRole: "is_chair_of" },
				{ workingGroupReportId, personToOrgUnitId: targetRelationId, chairRole: "is_chair_of" },
			]);

			await mergeEntities(tx, source, target);

			// Re-pointing the source's row would list the target relation twice (and trip the unique key),
			// so it collapses into the row the report already had.
			expect(
				await tx
					.select({ personToOrgUnitId: schema.workingGroupReportChairs.personToOrgUnitId })
					.from(schema.workingGroupReportChairs)
					.where(eq(schema.workingGroupReportChairs.workingGroupReportId, workingGroupReportId)),
			).toStrictEqual([{ personToOrgUnitId: targetRelationId }]);
		});
	});

	it("rejects a merge when working-group report rows have different frozen chair roles", async () => {
		await withTransaction(async (tx) => {
			const { source, target, sourceRelationId, targetRelationId, workingGroupReportId } =
				await createOverlappingPersonRelations(tx);

			await tx.insert(schema.workingGroupReportChairs).values([
				{ workingGroupReportId, personToOrgUnitId: sourceRelationId, chairRole: "is_chair_of" },
				{
					workingGroupReportId,
					personToOrgUnitId: targetRelationId,
					chairRole: "is_vice_chair_of",
				},
			]);

			await expect(mergeEntities(tx, source, target)).rejects.toThrow(
				"working_group_report_chairs contains conflicting frozen report roles",
			);

			expect(await tx.query.entities.findFirst({ where: { id: source } })).toBeDefined();
			expect(
				await tx
					.select({ chairRole: schema.workingGroupReportChairs.chairRole })
					.from(schema.workingGroupReportChairs)
					.where(eq(schema.workingGroupReportChairs.workingGroupReportId, workingGroupReportId)),
			).toHaveLength(2);
		});
	});

	it("rejects a merge when country-report rows have different frozen contribution roles", async () => {
		await withTransaction(async (tx) => {
			const { source, target, sourceRelationId, targetRelationId, campaignId } =
				await createOverlappingPersonRelations(tx);
			const entityTypeId = await getPersonTypeId(tx);
			const countryDocumentId = await createBareEntity(tx, entityTypeId);
			const [report] = await tx
				.insert(schema.countryReports)
				.values({ campaignId, countryDocumentId })
				.returning({ id: schema.countryReports.id });
			assert(report);

			await tx.insert(schema.countryReportContributions).values([
				{
					countryReportId: report.id,
					personToOrgUnitId: sourceRelationId,
					contributionRole: "national_coordinator",
				},
				{
					countryReportId: report.id,
					personToOrgUnitId: targetRelationId,
					contributionRole: "national_coordinator_deputy",
				},
			]);

			await expect(mergeEntities(tx, source, target)).rejects.toThrow(
				"country_report_contributions contains conflicting frozen report roles",
			);

			expect(await tx.query.entities.findFirst({ where: { id: source } })).toBeDefined();
			expect(
				await tx
					.select({ contributionRole: schema.countryReportContributions.contributionRole })
					.from(schema.countryReportContributions)
					.where(eq(schema.countryReportContributions.countryReportId, report.id)),
			).toHaveLength(2);
		});
	});
});

/**
 * Two persons with the same org, role, and (open-ended) period: once the source's relation is
 * re-pointed onto the target it overlaps the target's existing relation, so it is a duplicate.
 */
async function createOverlappingPersonRelations(tx: Tx): Promise<{
	source: string;
	target: string;
	sourceRelationId: string;
	targetRelationId: string;
	workingGroupReportId: string;
	campaignId: string;
}> {
	const personTypeId = await getPersonTypeId(tx);
	const roleTypeId = await getPersonRoleTypeId(tx);

	const source = await createPublishedDocument(tx, personTypeId, `merge-src-${randomUUID()}`);
	const target = await createPublishedDocument(tx, personTypeId, `merge-tgt-${randomUUID()}`);
	const orgUnit = await createBareEntity(tx, personTypeId);

	const duration = { start: new Date("2020-01-01T00:00:00.000Z") };
	const [sourceRelation, targetRelation] = await tx
		.insert(schema.personsToOrganisationalUnits)
		.values([
			{
				personDocumentId: source.documentId,
				organisationalUnitDocumentId: orgUnit,
				roleTypeId,
				duration,
			},
			{
				personDocumentId: target.documentId,
				organisationalUnitDocumentId: orgUnit,
				roleTypeId,
				duration,
			},
		])
		.returning({ id: schema.personsToOrganisationalUnits.id });
	assert(sourceRelation);
	assert(targetRelation);

	const [campaign] = await tx
		.insert(schema.reportingCampaigns)
		.values({ year: 2_000_000 + Math.floor(Math.random() * 1_000_000) })
		.returning({ id: schema.reportingCampaigns.id });
	assert(campaign);
	const [report] = await tx
		.insert(schema.workingGroupReports)
		.values({ campaignId: campaign.id, workingGroupDocumentId: orgUnit })
		.returning({ id: schema.workingGroupReports.id });
	assert(report);

	return {
		source: source.documentId,
		target: target.documentId,
		sourceRelationId: sourceRelation.id,
		targetRelationId: targetRelation.id,
		workingGroupReportId: report.id,
		campaignId: campaign.id,
	};
}
