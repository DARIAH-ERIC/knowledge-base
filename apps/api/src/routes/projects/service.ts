/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, not, sql } from "@/services/db/sql";
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
	status?: "active" | "inactive";
}

export async function getProjects(db: Database | Transaction, params: GetProjectsParams) {
	const { limit = 10, offset = 0, status } = params;

	const [items, aggregate] = await Promise.all([
		db.query.projects.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
				RAW:
					status != null
						? (t) => {
								const durationContainsNow = sql`${t.duration} @> NOW()::TIMESTAMPTZ`;
								return status === "active" ? durationContainsNow : not(durationContainsNow);
							}
						: undefined,
			},
			columns: {
				id: true,
				name: true,
				summary: true,
				duration: true,
				call: true,
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
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					status != null
						? status === "active"
							? sql`${schema.projects.duration} @> NOW()::TIMESTAMPTZ`
							: not(sql`${schema.projects.duration} @> NOW()::TIMESTAMPTZ`)
						: undefined,
				),
			),
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
				projectsToOrganisationalUnits: {
					columns: {},
					with: {
						role: {
							columns: {
								id: true,
								role: true,
							},
						},
						unit: {
							columns: {
								id: true,
								acronym: true,
								name: true,
							},
							with: {
								socialMedia: {
									columns: {
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
								type: {
									columns: {
										type: true,
									},
								},
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

	const socialMedia = item.socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
		};
	});

	const { projectsToOrganisationalUnits, ...rest } = item;

	const funders = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "funder";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
				role: r.role.role,
			};
		});
	const partners = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role !== "funder";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
				role: r.role.role,
			};
		});

	return {
		...rest,
		duration,
		image,
		socialMedia,
		funders,
		partners,
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
			projectsToOrganisationalUnits: {
				columns: {},
				with: {
					role: {
						columns: {
							id: true,
							role: true,
						},
					},
					unit: {
						columns: {
							id: true,
							acronym: true,
							name: true,
						},
						with: {
							socialMedia: {
								columns: {
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
							type: {
								columns: {
									type: true,
								},
							},
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

	const { projectsToOrganisationalUnits, ...rest } = item;

	const funders = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "funder";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
				role: r.role.role,
			};
		});
	const partners = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role !== "funder";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
				role: r.role.role,
			};
		});

	return {
		...rest,
		duration,
		image,
		socialMedia,
		funders,
		partners,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}
