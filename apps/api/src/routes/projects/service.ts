/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetProjectsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getProjects(db: Database | Transaction, params: GetProjectsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.projects.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
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
				institutions: {
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
				scope: {
					columns: {
						scope: true,
					},
				},
				socialMedia: {
					columns: {
						id: true,
						url: true,
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
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image =
			item.image != null
				? images.generateSignedImageUrl({
						key: item.image.key,
						options: { width: imageWidth.preview },
					})
				: null;

		const institutions = item.institutions.map(({ type, ...rest }) => {
			return { ...rest, type: type.type };
		});

		const duration = {
			start: item.duration.start.toISOString(),
			end: item.duration.end?.toISOString(),
		};

		const socialMedia = item.socialMedia.map((sm) => {
			return {
				...sm,
				type: sm.type.type,
			};
		});

		return {
			...item,
			duration,
			image,
			institutions,
			socialMedia,
			publishedAt: item.entity.updatedAt.toISOString(),
		};
	});

	return { data, limit, offset, total };
}

//

interface GetProjectByIdParams {
	id: schema.Project["id"];
}

export async function getProjectById(db: Database | Transaction, params: GetProjectByIdParams) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.projects.findFirst({
			where: {
				id,
				entity: {
					status: {
						type: "published",
					},
				},
			},
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
				institutions: {
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
				scope: {
					columns: {
						scope: true,
					},
				},
				socialMedia: {
					columns: {
						id: true,
						url: true,
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
		}),
		getContentBlocks(db, id),
	]);

	if (item == null) {
		return null;
	}

	const image =
		item.image != null
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	const institutions = item.institutions.map(({ type, ...rest }) => {
		return { ...rest, type: type.type };
	});

	const socialMedia = item.socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
		};
	});

	return {
		...item,
		duration,
		image,
		institutions,
		socialMedia,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}

//

interface GetProjectSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getProjectSlugs(db: Database | Transaction, params: GetProjectSlugsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.projects.findMany({
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
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetProjectBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getProjectBySlug(db: Database | Transaction, params: GetProjectBySlugParams) {
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
			institutions: {
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
			scope: {
				columns: {
					scope: true,
				},
			},
			socialMedia: {
				columns: {
					id: true,
					url: true,
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
	});

	if (item == null) {
		return null;
	}

	const image =
		item.image != null
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	const institutions = item.institutions.map(({ type, ...rest }) => {
		return { ...rest, type: type.type };
	});

	const socialMedia = item.socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
		};
	});

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	const fields = await getContentBlocks(db, item.id);

	return {
		...item,
		duration,
		image,
		institutions,
		socialMedia,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}
