/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { db } from "@/lib/db";
import { count, eq, ilike, inArray } from "@/lib/db/sql";
import { images } from "@/lib/images";

export interface OrganisationalUnitOption {
	id: string;
	name: string;
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
}

export async function getOrganisationalUnitOptions(
	params: GetOrganisationalUnitOptionsParams = {},
): Promise<{ items: Array<OrganisationalUnitOption>; total: number }> {
	const { limit = 20, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? ilike(schema.organisationalUnits.name, `%${query}%`)
			: undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.organisationalUnits.id, name: schema.organisationalUnits.name })
			.from(schema.organisationalUnits)
			.where(where)
			.orderBy(schema.organisationalUnits.name)
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.organisationalUnits).where(where),
	]);

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

export async function getOrganisationalUnitOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const rows = await db
		.select({ id: schema.organisationalUnits.id, name: schema.organisationalUnits.name })
		.from(schema.organisationalUnits)
		.where(inArray(schema.organisationalUnits.id, [...ids]))
		.orderBy(schema.organisationalUnits.name);

	const itemById = new Map(
		rows.map((row) => {
			return [row.id, row] as const;
		}),
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
		if (!item.image) return base;
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

	if (!item.image) return base;
	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...base, image };

	return data;
}

export type OrganisationalUnitsWithEntities = Awaited<ReturnType<typeof getOrganisationalUnits>>;
export type OrganisationalUnitWithEntities = Awaited<ReturnType<typeof getOrganisationalUnitById>>;
