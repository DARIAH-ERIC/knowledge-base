/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, ilike, inArray, or } from "@dariah-eric/database/sql";
import { db, type Transaction } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { relationOptionsPageSize } from "@/lib/constants/relations";
import { search } from "@/lib/search";

export interface RelationOptionItem {
	id: string;
	name: string;
	description?: string;
}

interface GetRelationOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

export async function getEntityRelationOptions(
	params: GetRelationOptionsParams = {},
): Promise<{ items: Array<RelationOptionItem>; total: number }> {
	const { limit = relationOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(ilike(schema.entities.slug, `%${query}%`), ilike(schema.entityTypes.type, `%${query}%`))
			: undefined;

	const [rows, aggregate] = await Promise.all([
		db
			.select({
				entityType: schema.entityTypes.type,
				id: schema.entities.id,
				slug: schema.entities.slug,
			})
			.from(schema.entities)
			.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
			.where(where)
			.orderBy(schema.entities.slug)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.entities)
			.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
			.where(where),
	]);

	return {
		items: rows.map((row) => {
			return { id: row.id, name: `${row.entityType} / ${row.slug}` };
		}),
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getEntityRelationOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const rows = await db
		.select({
			entityType: schema.entityTypes.type,
			id: schema.entities.id,
			slug: schema.entities.slug,
		})
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.where(inArray(schema.entities.id, [...ids]))
		.orderBy(schema.entities.slug);

	const itemById = new Map(
		rows.map((row) => {
			return [row.id, { id: row.id, name: `${row.entityType} / ${row.slug}` }] as const;
		}),
	);

	return ids.flatMap((id) => {
		const item = itemById.get(id);
		return item != null ? [item] : [];
	});
}

export async function getAvailableEntities() {
	const { items } = await getEntityRelationOptions({ limit: 250 });
	return items;
}

export async function getResourceRelationOptions(
	params: GetRelationOptionsParams = {},
): Promise<{ items: Array<RelationOptionItem>; total: number }> {
	const { limit = relationOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();

	try {
		const page = Math.floor(offset / limit) + 1;
		const result = await search.collections.resources.search({
			page,
			perPage: limit,
			query: query != null && query !== "" ? query : "*",
			queryBy: ["label"],
			sortBy: [{ field: "label", direction: "asc" }],
		});

		if (result.isErr()) {
			throw result.error;
		}

		return {
			items: result.value.items.map((hit) => {
				return {
					description: hit.document.type,
					id: hit.document.id,
					name: hit.document.label,
				};
			}),
			total: result.value.pagination.total,
		};
	} catch {
		return { items: [], total: 0 };
	}
}

export async function getResourceRelationOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	try {
		const result = await search.collections.resources.search({
			filterBy: `id:[${ids.join(",")}]`,
			perPage: ids.length,
			query: "*",
			queryBy: ["label"],
			sortBy: [{ field: "label", direction: "asc" }],
		});

		if (result.isErr()) {
			throw result.error;
		}

		const itemById = new Map(
			result.value.items.map((hit) => {
				return [
					hit.document.id,
					{
						description: hit.document.type,
						id: hit.document.id,
						name: hit.document.label,
					},
				] as const;
			}),
		);

		return ids.flatMap((id) => {
			const item = itemById.get(id);
			return item != null ? [item] : [];
		});
	} catch {
		return [];
	}
}

export async function getAvailableResources() {
	const { items } = await getResourceRelationOptions({ limit: 250 });

	return items.map((item) => {
		return { id: item.id, label: item.name };
	});
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
