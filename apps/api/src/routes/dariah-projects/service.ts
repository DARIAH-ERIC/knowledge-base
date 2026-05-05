/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, not, sql } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

function mapItem<
	T extends {
		image: { key: string } | null;
		socialMedia: Array<{
			id: string;
			url: string;
			type: { type: string };
		}>;
		entityVersion: { updatedAt: Date };
		duration: { start: Date; end?: Date };
	},
>(item: T, width: number) {
	const image =
		item.image != null
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width },
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
		publishedAt: item.entityVersion.updatedAt.toISOString(),
	};
}

//

interface GetDariahProjectsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	status?: "active" | "inactive";
}

export async function getDariahProjects(
	db: Database | Transaction,
	params: GetDariahProjectsParams,
) {
	const { limit = 10, offset = 0, status } = params;

	const [items, aggregate] = await Promise.all([
		db.query.dariahProjects.findMany({
			where: {
				entityVersion: {
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
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
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
					where: {
						role: {
							role: {
								in: ["coordinator", "participant"],
							},
						},
					},
					columns: {},
					with: {
						unit: {
							columns: {},
							with: {
								type: {
									columns: {
										type: true,
									},
								},
							},
						},
						role: {
							columns: {
								role: true,
							},
						},
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
			.from(schema.dariahProjects)
			.innerJoin(schema.entityVersions, eq(schema.dariahProjects.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					status != null
						? status === "active"
							? sql`${schema.dariahProjects.duration} @> NOW()::TIMESTAMPTZ`
							: not(sql`${schema.dariahProjects.duration} @> NOW()::TIMESTAMPTZ`)
						: undefined,
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const { projectsToOrganisationalUnits, ...rest } = item;

		const role =
			projectsToOrganisationalUnits.find((r) => {
				return r.unit.type.type === "eric";
			})?.role.role ?? null;

		return {
			...mapItem(rest, imageWidth.preview),
			role,
		};
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

	const [item, fields] = await Promise.all([
		db.query.dariahProjects.findFirst({
			where: {
				id,
				entityVersion: {
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
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
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
					where: {
						role: {
							role: {
								in: ["coordinator", "participant"],
							},
						},
					},
					columns: {},
					with: {
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
						role: {
							columns: {
								role: true,
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

	const [relatedEntities, relatedResources] = await Promise.all([
		getRelatedEntities(db, id),
		getRelatedResources(db, id),
	]);

	const { projectsToOrganisationalUnits, ...rest } = item;

	const participants = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "participant";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
			};
		});

	const coordinators = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "coordinator";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
			};
		});

	return {
		...mapItem(rest, imageWidth.featured),
		...fields,
		participants,
		coordinators,
		relatedEntities,
		relatedResources,
	};
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
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
			},
			with: {
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
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
			.from(schema.dariahProjects)
			.innerJoin(schema.entityVersions, eq(schema.dariahProjects.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const data = items.map(({ id, entityVersion }) => {
		return { id, entity: { slug: entityVersion.entity.slug } };
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
			entityVersion: {
				status: {
					type: "published",
				},
				entity: {
					slug,
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
			entityVersion: {
				columns: { updatedAt: true },
				with: {
					entity: {
						columns: { slug: true },
					},
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
				where: {
					role: {
						role: {
							in: ["coordinator", "participant"],
						},
					},
				},
				columns: {},
				with: {
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
					role: {
						columns: {
							role: true,
						},
					},
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const [fields, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	const { projectsToOrganisationalUnits, ...rest } = item;

	const participants = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "participant";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
			};
		});

	const coordinators = projectsToOrganisationalUnits
		.filter((r) => {
			return r.role.role === "coordinator";
		})
		.map((r) => {
			return {
				...r.unit,
				socialMedia: r.unit.socialMedia.map((sm) => {
					return { url: sm.url, type: sm.type.type };
				}),
				type: r.unit.type.type,
			};
		});

	return {
		...mapItem(rest, imageWidth.featured),
		...fields,
		participants,
		coordinators,
		relatedEntities,
		relatedResources,
	};
}
