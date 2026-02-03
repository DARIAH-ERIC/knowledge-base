/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import { imageAssetWidth } from "@/config/assets.config";

interface GetOrganisationalUnitsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
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
		const image = client.urls.generateSignedImageUrl({
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
	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...item, image };

	return data;
}

interface CreateOrganisationalUnitParams extends Omit<
	schema.OrganisationalUnitInput,
	"id" | "createdAt" | "updatedAt"
> {
	slug: string;
	resourceIds?: Array<string>;
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
		where: { type: "draft" },
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
