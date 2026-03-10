/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, countDistinct, desc, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

const umbrellaConsortiumType = "umbrella_consortium" as const;

const projectWithLinksQuery = {
	columns: {
		id: true,
		name: true,
		summary: true,
		duration: true,
		call: true,
		funders: true,
		topic: true,
		funding: true,
	},
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
		partners: {
			columns: {
				roleId: true,
			},
			with: {
				unit: {
					columns: {
						id: true,
						name: true,
					},
					with: {
						type: {
							columns: {
								type: true,
							},
						},
					},
				},
			},
		},
		scope: {
			columns: {
				scope: true,
			},
		},
	},
} as const;

function isDariahProject(item: { partners: Array<{ unit: { type: { type: string } } }> }) {
	return item.partners.some((link) => {
		return link.unit.type.type === umbrellaConsortiumType;
	});
}

//

interface GetDariahProjectsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getDariahProjects(
	db: Database | Transaction,
	params: GetDariahProjectsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [qualifyingRows, aggregate] = await Promise.all([
		db
			.selectDistinct({
				id: schema.projects.id,
				updatedAt: schema.entities.updatedAt,
			})
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.projectPartners,
				eq(schema.projectPartners.projectId, schema.projects.id),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.projectPartners.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, umbrellaConsortiumType),
				),
			)
			.orderBy(desc(schema.entities.updatedAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: countDistinct(schema.projects.id) })
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.projectPartners,
				eq(schema.projectPartners.projectId, schema.projects.id),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.projectPartners.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, umbrellaConsortiumType),
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const ids = qualifyingRows.map((r) => {
		return r.id;
	});

	if (ids.length === 0) {
		return { data: [], limit, offset, total };
	}

	const items = await db.query.projects.findMany({
		where: {
			id: { in: ids },
		},
		...projectWithLinksQuery,
		orderBy(t, { desc, sql }) {
			return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
		},
	});

	const data = items.map((item) => {
		const image =
			item.image != null
				? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.preview },
				})
				: null;

		const institutions = item.partners.map(({ roleId, unit }) => {
			return { id: unit.id, name: unit.name, type: unit.type.type, roleId };
		});

		const { partners: _, ...rest } = item;

		return { ...rest, image, institutions };
	});

	return { data, limit, offset, total };
}

//

interface GetDariahProjectByIdParams {
	id: schema.Project["id"];
}

export async function getDariahProjectById(
	db: Database | Transaction,
	params: GetDariahProjectByIdParams,
) {
	const { id } = params;

	const item = await db.query.projects.findFirst({
		where: {
			id,
			entity: {
				status: {
					type: "published",
				},
			},
		},
		...projectWithLinksQuery,
	});

	if (item == null || !isDariahProject(item)) {
		return null;
	}

	const { partners: _, ...rest } = item;

	const image =
		item.image != null
			? images.generateSignedImageUrl({
				key: item.image.key,
				options: { width: imageWidth.featured },
			})
			: null;

	// eslint-disable-next-line unicorn/consistent-destructuring
	const institutions = item.partners.map(({ roleId, unit }) => {
		return { id: unit.id, name: unit.name, type: unit.type.type, roleId };
	});

	return { ...rest, image, institutions };
}

//

interface GetDariahProjectSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getDariahProjectSlugs(
	db: Database | Transaction,
	params: GetDariahProjectSlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db
			.selectDistinct({
				id: schema.projects.id,
				slug: schema.entities.slug,
				updatedAt: schema.entities.updatedAt,
			})
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.projectPartners,
				eq(schema.projectPartners.projectId, schema.projects.id),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.projectPartners.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, umbrellaConsortiumType),
				),
			)
			.orderBy(desc(schema.entities.updatedAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: countDistinct(schema.projects.id) })
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.projectPartners,
				eq(schema.projectPartners.projectId, schema.projects.id),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.projectPartners.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, umbrellaConsortiumType),
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const data = items.map(({ id, slug }) => {
		return { id, entity: { slug } };
	});

	return { data, limit, offset, total };
}

//

interface GetDariahProjectBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getDariahProjectBySlug(
	db: Database | Transaction,
	params: GetDariahProjectBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.projects.findFirst({
		where: {
			entity: {
				slug,
				status: {
					type: "published",
				},
			},
		},
		...projectWithLinksQuery,
	});

	if (item == null || !isDariahProject(item)) {
		return null;
	}

	const { partners: _, ...rest } = item;

	const image =
		item.image != null
			? images.generateSignedImageUrl({
				key: item.image.key,
				options: { width: imageWidth.featured },
			})
			: null;

	// eslint-disable-next-line unicorn/consistent-destructuring
	const institutions = item.partners.map(({ roleId, unit }) => {
		return { id: unit.id, name: unit.name, type: unit.type.type, roleId };
	});

	return { ...rest, image, institutions };
}
