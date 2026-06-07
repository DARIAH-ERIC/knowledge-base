/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, count, eq, ilike, inArray } from "@/lib/db/sql";
import { images } from "@/lib/images";

/** The literal union of organisational-unit types (e.g. "institution", "national_consortium"). */
export type OrganisationalUnitType = typeof schema.organisationalUnitTypes.$inferSelect.type;

export interface OrganisationalUnitOption {
	id: string;
	name: string;
	description: string;
}

function formatOrganisationalUnitType(type: string): string {
	return type.replaceAll("_", " ");
}

interface GetOrganisationalUnitsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

interface GetOrganisationalUnitOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
	/** Restrict options to a single organisational-unit type (e.g. "institution"). */
	unitType?: OrganisationalUnitType;
}

export async function getOrganisationalUnitOptions(
	params: GetOrganisationalUnitOptionsParams = {},
): Promise<{ items: Array<OrganisationalUnitOption>; total: number }> {
	const { limit = 20, offset = 0, q, unitType } = params;
	const query = q?.trim();
	const searchWhere =
		query != null && query !== ""
			? ilike(schema.organisationalUnits.name, `%${query}%`)
			: undefined;
	const typeWhere =
		unitType != null ? eq(schema.organisationalUnitTypes.type, unitType) : undefined;
	const where = and(publishedEntityVersionWhere(), searchWhere, typeWhere);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.organisationalUnits.id,
				name: schema.organisationalUnits.name,
				type: schema.organisationalUnitTypes.type,
			})
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where)
			.orderBy(schema.organisationalUnits.name)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where),
	]);

	return {
		items: items.map((item) => {
			return {
				id: item.id,
				name: item.name,
				description: formatOrganisationalUnitType(item.type),
			};
		}),
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getOrganisationalUnitOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const rows = await db
		.select({
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			type: schema.organisationalUnitTypes.type,
		})
		.from(schema.organisationalUnits)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(and(publishedEntityVersionWhere(), inArray(schema.organisationalUnits.id, [...ids])))
		.orderBy(schema.organisationalUnits.name);

	const itemById = new Map(
		rows.map(
			(row) =>
				[
					row.id,
					{
						id: row.id,
						name: row.name,
						description: formatOrganisationalUnitType(row.type),
					},
				] as const,
		),
	);

	return ids.flatMap((id) => {
		const item = itemById.get(id);
		return item != null ? [item] : [];
	});
}

export async function getOrganisationalUnits(params: GetOrganisationalUnitsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.organisationalUnits.findMany({
			with: {
				entityVersion: {
					columns: { id: true, updatedAt: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entityVersion"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const { entityVersion, ...rest } = item;
		const base = {
			...rest,
			entity: { slug: entityVersion.entity.slug, updatedAt: entityVersion.updatedAt },
		};
		if (!item.image) {
			return base;
		}
		const image = images.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageAssetWidth.preview },
		});

		return { ...base, image };
	});

	return { data, limit, offset, total };
}

interface GetOrganisationalUnitByIdParams {
	id: schema.OrganisationalUnit["id"];
}

export async function getOrganisationalUnitById(params: GetOrganisationalUnitByIdParams) {
	const { id } = params;

	const item = await db.query.organisationalUnits.findFirst({
		where: {
			id,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: {
							slug: true,
						},
					},
				},
			},
			image: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const { entityVersion, ...rest } = item;
	const base = { ...rest, entity: entityVersion.entity };

	if (!item.image) {
		return base;
	}
	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...base, image };

	return data;
}

export type OrganisationalUnitsWithEntities = Awaited<ReturnType<typeof getOrganisationalUnits>>;
export type OrganisationalUnitWithEntities = Awaited<ReturnType<typeof getOrganisationalUnitById>>;
