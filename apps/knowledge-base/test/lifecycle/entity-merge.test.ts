import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import { mergeEntities } from "@/lib/data/entity-merge";
import { and, eq, ne, sql } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

describe("mergeEntities (against migrated dump)", () => {
	it("re-points a duplicate project's relations onto the target and deletes the source", async () => {
		await withTransaction(async (tx) => {
			const source = await tx.query.entities.findFirst({
				where: { slug: { like: "oscars-duplicate%" } },
				columns: { id: true },
			});
			assert(source, "expected an 'oscars-duplicate' project in the dump");

			// Any other, non-duplicate project of the same type is a valid mechanical merge target.
			const target = await tx
				.select({ id: schema.entities.id })
				.from(schema.entities)
				.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
				.where(
					and(
						eq(schema.entityTypes.type, "projects"),
						ne(schema.entities.id, source.id),
						sql`${schema.entities.slug} not like '%-duplicate%'`,
					),
				)
				.limit(1)
				.then((rows) => rows[0]);
			assert(target, "expected a canonical project to merge into");

			const sourceP2ouBefore = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, source.id))
				.then((r) => r[0]?.n ?? 0);
			const sourceCrpcBefore = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.countryReportProjectContributions)
				.where(eq(schema.countryReportProjectContributions.projectDocumentId, source.id))
				.then((r) => r[0]?.n ?? 0);
			const targetP2ouBefore = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, target.id))
				.then((r) => r[0]?.n ?? 0);

			// After the merge, the target should hold exactly the distinct union of both projects'
			// (unit, role) pairs — colliding source rows are deduped, not duplicated or lost.
			const expectedUnion = await tx
				.select({ n: sql<number>`count(distinct (unit_document_id, role_id))::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(
					sql`${schema.projectsToOrganisationalUnits.projectDocumentId} in (${source.id}, ${target.id})`,
				)
				.then((r) => r[0]?.n ?? 0);

			expect(sourceP2ouBefore).toBeGreaterThan(0);

			await mergeEntities(tx, source.id, target.id);

			// Source document is fully gone.
			const sourceEntity = await tx.query.entities.findFirst({ where: { id: source.id } });
			expect(sourceEntity).toBeUndefined();

			const sourceVersions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, source.id));
			expect(sourceVersions).toHaveLength(0);

			// Target is intact.
			const targetEntity = await tx.query.entities.findFirst({ where: { id: target.id } });
			expect(targetEntity).toBeDefined();

			// Relations moved off the source.
			const sourceP2ouAfter = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, source.id))
				.then((r) => r[0]?.n ?? 0);
			expect(sourceP2ouAfter).toBe(0);

			const sourceCrpcAfter = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.countryReportProjectContributions)
				.where(eq(schema.countryReportProjectContributions.projectDocumentId, source.id))
				.then((r) => r[0]?.n ?? 0);
			expect(sourceCrpcAfter).toBe(0);

			// …and onto the target, deduped to the distinct union of (unit, role) pairs.
			const targetP2ouAfter = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, target.id))
				.then((r) => r[0]?.n ?? 0);
			expect(targetP2ouAfter).toBe(expectedUnion);
			expect(targetP2ouAfter).toBeGreaterThanOrEqual(targetP2ouBefore);
			expect(targetP2ouAfter).toBeLessThanOrEqual(targetP2ouBefore + sourceP2ouBefore);

			// The report contribution moved too.
			const targetCrpcMoved = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.countryReportProjectContributions)
				.where(eq(schema.countryReportProjectContributions.projectDocumentId, target.id))
				.then((r) => r[0]?.n ?? 0);
			expect(targetCrpcMoved).toBeGreaterThanOrEqual(sourceCrpcBefore);
		});
	});

	it("is idempotent-safe: merging on a pair with overlapping relations dedupes rather than errors", async () => {
		await withTransaction(async (tx) => {
			const source = await tx.query.entities.findFirst({
				where: { slug: { like: "oscars-duplicate%" } },
				columns: { id: true },
			});
			assert(source, "expected an 'oscars-duplicate' project in the dump");

			const target = await tx
				.select({ id: schema.entities.id })
				.from(schema.entities)
				.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
				.where(
					and(
						eq(schema.entityTypes.type, "projects"),
						ne(schema.entities.id, source.id),
						sql`${schema.entities.slug} not like '%-duplicate%'`,
					),
				)
				.limit(1)
				.then((rows) => rows[0]);
			assert(target, "expected a canonical project to merge into");

			// Pre-seed the target with a copy of every source relation so that every re-point collides.
			await tx.execute(sql`
				insert into projects_to_organisational_units (project_document_id, unit_document_id, role_id, duration)
				select ${target.id}, unit_document_id, role_id, duration
				from projects_to_organisational_units
				where project_document_id = ${source.id}
				on conflict do nothing
			`);

			const targetP2ouBefore = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, target.id))
				.then((r) => r[0]?.n ?? 0);

			// Should not throw despite every incoming relation colliding.
			await mergeEntities(tx, source.id, target.id);

			const targetP2ouAfter = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectDocumentId, target.id))
				.then((r) => r[0]?.n ?? 0);

			// All collided → deduped, target count unchanged.
			expect(targetP2ouAfter).toBe(targetP2ouBefore);

			const sourceEntity = await tx.query.entities.findFirst({ where: { id: source.id } });
			expect(sourceEntity).toBeUndefined();
		});
	});

	it("re-points the self-referential entities_to_entities on both endpoints, dropping self-relations and dedup", async () => {
		await withTransaction(async (tx) => {
			const projectType = await tx.query.entityTypes.findFirst({
				where: { type: "projects" },
				columns: { id: true },
			});
			assert(projectType, "projects entity type not found");

			async function makeEntity(slug: string): Promise<string> {
				const [row] = await tx
					.insert(schema.entities)
					.values({ slug, typeId: projectType!.id })
					.returning({ id: schema.entities.id });
				assert(row);
				return row.id;
			}

			const sourceId = await makeEntity("merge-test-source");
			const targetId = await makeEntity("merge-test-target");
			const otherId = await makeEntity("merge-test-other");

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
});
