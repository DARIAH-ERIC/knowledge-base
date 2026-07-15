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

	it("drops the children of an overlapping person↔org relation (chairs + contributions) instead of aborting", async () => {
		await withTransaction(async (tx) => {
			const personTypeId = await getPersonTypeId(tx);
			const roleTypeId = await getPersonRoleTypeId(tx);

			const source = await createPublishedDocument(tx, personTypeId, `merge-src-${randomUUID()}`);
			const target = await createPublishedDocument(tx, personTypeId, `merge-tgt-${randomUUID()}`);
			const orgUnit = await createBareEntity(tx, personTypeId);

			// Same org, role, and (open-ended) period for both persons: once the source relation is
			// re-pointed onto the target it overlaps the target's existing relation and must be dropped.
			const duration = { start: new Date("2020-01-01T00:00:00.000Z") };
			const [sourceRelation] = await tx
				.insert(schema.personsToOrganisationalUnits)
				.values({
					personDocumentId: source.documentId,
					organisationalUnitDocumentId: orgUnit,
					roleTypeId,
					duration,
				})
				.returning({ id: schema.personsToOrganisationalUnits.id });
			assert(sourceRelation);
			await tx.insert(schema.personsToOrganisationalUnits).values({
				personDocumentId: target.documentId,
				organisationalUnitDocumentId: orgUnit,
				roleTypeId,
				duration,
			});

			// Capture the source relation as a working-group-report chair — a child keyed by the relation
			// id whose FK does NOT cascade, so it must be deleted before the overlapping relation is, or
			// the merge aborts with a foreign-key violation.
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
			await tx.insert(schema.workingGroupReportChairs).values({
				workingGroupReportId: report.id,
				personToOrgUnitId: sourceRelation.id,
				chairRole: "is_chair_of",
			});

			// Pre-fix this raised a foreign_key_violation from the orphaned chair row.
			await mergeEntities(tx, source.documentId, target.documentId);

			expect(
				await tx.query.entities.findFirst({ where: { id: source.documentId } }),
			).toBeUndefined();
			// The chair keyed to the deleted overlapping relation is cleaned up.
			expect(
				await tx
					.select({ id: schema.workingGroupReportChairs.id })
					.from(schema.workingGroupReportChairs)
					.where(eq(schema.workingGroupReportChairs.workingGroupReportId, report.id)),
			).toHaveLength(0);
			// Target keeps exactly its own single relation to the org.
			expect(
				await tx
					.select({ id: schema.personsToOrganisationalUnits.id })
					.from(schema.personsToOrganisationalUnits)
					.where(eq(schema.personsToOrganisationalUnits.personDocumentId, target.documentId)),
			).toHaveLength(1);
		});
	});
});
