/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, exists, not, sql, type SQLWrapper } from "@dariah-eric/database/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getPersonPositions } from "@/lib/persons";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetWorkingGroupsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	status?: "active" | "inactive";
}

function buildStatusFilter(
	db: Database | Transaction,
	idRef: SQLWrapper,
	status: "active" | "inactive",
) {
	const durationContainsNow = sql`
		${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ
	`;
	const durationCondition = status === "active" ? durationContainsNow : not(durationContainsNow);

	return exists(
		db
			.select({ one: sql<number>`1` })
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.organisationalUnitsRelations.unitId, idRef),
					eq(schema.organisationalUnitStatus.status, "is_part_of"),
					eq(schema.organisationalUnitTypes.type, "eric"),
					durationCondition,
				),
			),
	);
}

export async function getWorkingGroups(db: Database | Transaction, params: GetWorkingGroupsParams) {
	const { limit = 10, offset = 0, status } = params;

	const [items, aggregate] = await Promise.all([
		db.query.workingGroups.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
				RAW:
					status != null
						? (t) => {
								return buildStatusFilter(db, t.id, status);
							}
						: undefined,
			},
			columns: {
				id: true,
				metadata: true,
				name: true,
				summary: true,
				sshocMarketplaceActorId: true,
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
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.workingGroups)
			.innerJoin(schema.entities, eq(schema.workingGroups.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					status != null ? buildStatusFilter(db, schema.workingGroups.id, status) : undefined,
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

		const socialMedia = item.socialMedia.map((sm) => {
			return {
				...sm,
				type: sm.type.type,
				duration: sm.duration
					? {
							start: sm.duration.start.toISOString(),
							end: sm.duration.end?.toISOString() ?? null,
						}
					: null,
			};
		});

		return { ...item, image, socialMedia, publishedAt: item.entity.updatedAt.toISOString() };
	});

	return { data, limit, offset, total };
}

//

interface GetWorkingGroupByIdParams {
	id: schema.OrganisationalUnit["id"];
}

async function getChairs(db: Database | Transaction, workingGroupId: string) {
	const rows = await db
		.select({
			id: schema.persons.id,
			name: schema.persons.name,
			slug: schema.entities.slug,
			imageKey: schema.assets.key,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.innerJoin(schema.persons, eq(schema.personsToOrganisationalUnits.personId, schema.persons.id))
		.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.where(
			and(
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, workingGroupId),
				eq(schema.personRoleTypes.type, "is_chair_of"),
				eq(schema.entityStatus.type, "published"),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const positions = await getPersonPositions(
		db,
		rows.map((row) => {
			return row.id;
		}),
	);

	return rows.map(({ imageKey, roleType, ...row }) => {
		return {
			...row,
			position: positions.get(row.id) ?? null,
			role: roleType,
			image: images.generateSignedImageUrl({
				key: imageKey,
				options: { width: imageWidth.avatar },
			}),
		};
	});
}

//

export async function getWorkingGroupById(
	db: Database | Transaction,
	params: GetWorkingGroupByIdParams,
) {
	const { id } = params;

	const [item, fields, chairs] = await Promise.all([
		db.query.workingGroups.findFirst({
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
				metadata: true,
				name: true,
				summary: true,
				sshocMarketplaceActorId: true,
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
		}),
		getContentBlocks(db, id),
		getChairs(db, id),
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

	const socialMedia = item.socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
			duration: sm.duration
				? {
						start: sm.duration.start.toISOString(),
						end: sm.duration.end?.toISOString() ?? null,
					}
				: null,
		};
	});

	const [relatedEntities, relatedResources] = await Promise.all([
		getRelatedEntities(db, id),
		getRelatedResources(db, id),
	]);

	return {
		...item,
		image,
		socialMedia,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		chairs,
		relatedEntities,
		relatedResources,
	};
}

//

interface GetWorkingGroupSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getWorkingGroupSlugs(
	db: Database | Transaction,
	params: GetWorkingGroupSlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.workingGroups.findMany({
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
			.from(schema.workingGroups)
			.innerJoin(schema.entities, eq(schema.workingGroups.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetWorkingGroupBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getWorkingGroupBySlug(
	db: Database | Transaction,
	params: GetWorkingGroupBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.workingGroups.findFirst({
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
			metadata: true,
			name: true,
			summary: true,
			sshocMarketplaceActorId: true,
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
			duration: sm.duration
				? {
						start: sm.duration.start.toISOString(),
						end: sm.duration.end?.toISOString() ?? null,
					}
				: null,
		};
	});

	const [fields, chairs, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getChairs(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	return {
		...item,
		image,
		socialMedia,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		chairs,
		relatedEntities,
		relatedResources,
	};
}
