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
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		if (!item.image) return;
		const image = images.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageAssetWidth.preview },
		});

		return { ...item, image };
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
			entity: {
				columns: {
					slug: true,
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

	if (!item.image) return item;
	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...item, image };

	return data;
}

interface CreateOrganisationalUnitParams extends schema.OrganisationalUnitInput {
	slug: schema.EntityInput["slug"];
}

export async function createOrganisationalUnit(params: CreateOrganisationalUnitParams) {
	const { imageId, metadata, name, slug, summary, typeId } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "organisational_units" },
	});

	if (entityType == null) {
		return null;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "published" },
	});

	if (entityStatus == null) {
		return null;
	}

	const entityId = await db.transaction(async (tx) => {
		const [item] = await tx
			.insert(schema.entities)
			.values({
				typeId: entityType.id,
				documentId: undefined,
				statusId: entityStatus.id,
				slug,
			})
			.returning({
				id: schema.entities.id,
			});

		if (item == null) {
			return tx.rollback();
		}

		const { id } = item;

		const organisationalUnit = {
			id,
			metadata,
			name,
			summary,
			imageId,
			typeId,
		};

		await tx.insert(schema.organisationalUnits).values(organisationalUnit);

		const fieldNamesIds = await tx.query.entityTypesFieldsNames.findMany({
			where: {
				entityTypeId: entityType.id,
			},
		});

		const fields = fieldNamesIds.map(({ id: fieldNameId }) => {
			return { entityId: id, fieldNameId };
		});

		await tx.insert(schema.fields).values(fields).returning({
			id: schema.fields.id,
		});

		return id;
	});

	return {
		entityId,
	};
}

export type OrganisationalUnitsWithEntities = Awaited<ReturnType<typeof getOrganisationalUnits>>;
export type OrganisationalUnitWithEntities = Awaited<ReturnType<typeof getOrganisationalUnitById>>;
