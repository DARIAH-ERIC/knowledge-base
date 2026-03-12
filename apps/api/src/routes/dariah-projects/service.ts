/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

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
		socialMedia: {
			columns: {
				id: true,
				name: true,
				url: true,
				duration: true,
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
} as const;

function mapItem<
	T extends {
		image: { key: string } | null;
		partners: Array<{ roleId: string; unit: { id: string; name: string; type: { type: string } } }>;
		socialMedia: Array<{
			id: string;
			name: string;
			url: string;
			duration: { start: Date; end?: Date | null };
			type: { type: string };
		}>;
	},
>(item: T, width: number) {
	const image =
		item.image != null
			? images.generateSignedImageUrl({
				key: item.image.key,
				options: { width },
			})
			: null;

	const institutions = item.partners.map(({ roleId, unit }) => {
		return { id: unit.id, name: unit.name, type: unit.type.type, roleId };
	});

	const socialMedia = item.socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
			duration: {
				start: sm.duration.start.toISOString(),
				end: sm.duration.end?.toISOString() ?? null,
			},
		};
	});

	const { partners: _, ...rest } = item;

	return { ...rest, image, institutions, socialMedia };
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

	const [items, aggregate] = await Promise.all([
		db.query.dariahProjects.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			...projectWithLinksQuery,
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.dariahProjects)
			.innerJoin(schema.entities, eq(schema.dariahProjects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return mapItem(item, imageWidth.preview);
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

	const item = await db.query.dariahProjects.findFirst({
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

	if (item == null) {
		return null;
	}

	return mapItem(item, imageWidth.featured);
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
		db.query.dariahProjects.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
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
			.from(schema.dariahProjects)
			.innerJoin(schema.entities, eq(schema.dariahProjects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const data = items.map(({ id, entity }) => {
		return { id, entity: { slug: entity.slug } };
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

	const item = await db.query.dariahProjects.findFirst({
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

	if (item == null) {
		return null;
	}

	return mapItem(item, imageWidth.featured);
}
