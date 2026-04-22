/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, eq, inArray } from "@dariah-eric/database";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { search } from "@/lib/search";

export async function getAvailableEntities() {
	const entities = await db.query.entities.findMany({
		columns: { id: true, slug: true },
		with: {
			type: { columns: { type: true } },
		},
		orderBy: { slug: "asc" },
	});

	return entities.map((entity) => {
		return { id: entity.id, name: `${entity.type.type} / ${entity.slug}` };
	});
}

export async function getAvailableResources() {
	try {
		const result = await search.collections.resources.search({
			query: "*",
			queryBy: ["label"],
			perPage: 250,
			sortBy: [{ field: "label", direction: "asc" }],
		});

		if (result.isErr()) {
			throw result.error;
		}

		return result.value.items.map((hit) => {
			return { id: hit.document.id, label: hit.document.label };
		});
	} catch {
		return [];
	}
}

export async function syncEntityRelations(
	tx: Transaction,
	entityId: string,
	relatedEntityIds: Array<string>,
	relatedResourceIds: Array<string>,
) {
	const [existingEntityRows, existingResourceRows] = await Promise.all([
		tx
			.select({ relatedEntityId: schema.entitiesToEntities.relatedEntityId })
			.from(schema.entitiesToEntities)
			.where(eq(schema.entitiesToEntities.entityId, entityId)),
		tx
			.select({ resourceId: schema.entitiesToResources.resourceId })
			.from(schema.entitiesToResources)
			.where(eq(schema.entitiesToResources.entityId, entityId)),
	]);

	const existingEntityIds = new Set(
		existingEntityRows.map((r) => {
			return r.relatedEntityId;
		}),
	);
	const existingResourceIds = new Set(
		existingResourceRows.map((r) => {
			return r.resourceId;
		}),
	);

	const entityIdsToDelete = [...existingEntityIds].filter((x) => {
		return !relatedEntityIds.includes(x);
	});
	const entityIdsToAdd = relatedEntityIds.filter((x) => {
		return !existingEntityIds.has(x);
	});

	const resourceIdsToDelete = [...existingResourceIds].filter((x) => {
		return !relatedResourceIds.includes(x);
	});
	const resourceIdsToAdd = relatedResourceIds.filter((x) => {
		return !existingResourceIds.has(x);
	});

	await Promise.all([
		entityIdsToDelete.length > 0
			? tx
					.delete(schema.entitiesToEntities)
					.where(
						and(
							eq(schema.entitiesToEntities.entityId, entityId),
							inArray(schema.entitiesToEntities.relatedEntityId, entityIdsToDelete),
						),
					)
			: Promise.resolve(),
		entityIdsToAdd.length > 0
			? tx.insert(schema.entitiesToEntities).values(
					entityIdsToAdd.map((relatedEntityId) => {
						return { entityId, relatedEntityId };
					}),
				)
			: Promise.resolve(),
		resourceIdsToDelete.length > 0
			? tx
					.delete(schema.entitiesToResources)
					.where(
						and(
							eq(schema.entitiesToResources.entityId, entityId),
							inArray(schema.entitiesToResources.resourceId, resourceIdsToDelete),
						),
					)
			: Promise.resolve(),
		resourceIdsToAdd.length > 0
			? tx.insert(schema.entitiesToResources).values(
					resourceIdsToAdd.map((resourceId) => {
						return { entityId, resourceId };
					}),
				)
			: Promise.resolve(),
	]);
}

export async function getEntityRelations(entityId: string) {
	const [entityRelations, resourceRelations] = await Promise.all([
		db
			.select({ relatedEntityId: schema.entitiesToEntities.relatedEntityId })
			.from(schema.entitiesToEntities)
			.where(eq(schema.entitiesToEntities.entityId, entityId)),
		db
			.select({ resourceId: schema.entitiesToResources.resourceId })
			.from(schema.entitiesToResources)
			.where(eq(schema.entitiesToResources.entityId, entityId)),
	]);

	return {
		relatedEntityIds: entityRelations.map((r) => {
			return r.relatedEntityId;
		}),
		relatedResourceIds: resourceRelations.map((r) => {
			return r.resourceId;
		}),
	};
}
