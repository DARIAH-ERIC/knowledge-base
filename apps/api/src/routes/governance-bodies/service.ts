/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, inArray, sql } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getPersonPositions } from "@/lib/persons";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetGovernanceBodiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

interface GovernanceBodyPerson {
	id: string;
	name: string;
	sortName: string;
	email: string | null;
	orcid: string | null;
	position: Awaited<ReturnType<typeof getPersonPositions>> extends Map<string, infer T> ? T : never;
	image: { url: string };
	slug: string;
	role: (typeof schema.personRoleTypesEnum)[number];
	duration: { start: string; end: string | null };
}

function mapSocialMedia(
	socialMedia: Array<{
		id: string;
		name: string;
		url: string;
		duration: {
			start: Date;
			end?: Date | undefined;
		} | null;
		type: { type: (typeof schema.socialMediaTypesEnum)[number] };
	}>,
) {
	return socialMedia.map((sm) => {
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
}

async function getActiveGovernanceBodyPersons(
	db: Database | Transaction,
	governanceBodyIds: Array<string>,
) {
	const personsByGovernanceBody = new Map<string, Array<GovernanceBodyPerson>>();

	for (const governanceBodyId of governanceBodyIds) {
		personsByGovernanceBody.set(governanceBodyId, []);
	}

	if (governanceBodyIds.length === 0) {
		return personsByGovernanceBody;
	}

	const rows = await db
		.select({
			governanceBodyId: schema.personsToOrganisationalUnits.organisationalUnitId,
			id: schema.persons.id,
			name: schema.persons.name,
			sortName: schema.persons.sortName,
			email: schema.persons.email,
			orcid: schema.persons.orcid,
			slug: schema.entities.slug,
			imageKey: schema.assets.key,
			role: schema.personRoleTypes.type,
			duration: schema.personsToOrganisationalUnits.duration,
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
				inArray(schema.personsToOrganisationalUnits.organisationalUnitId, governanceBodyIds),
				eq(schema.entityStatus.type, "published"),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const positions = await getPersonPositions(db, [...new Set(rows.map((row) => row.id))]);

	for (const row of rows) {
		const items = personsByGovernanceBody.get(row.governanceBodyId);

		if (items == null) continue;

		items.push({
			id: row.id,
			name: row.name,
			sortName: row.sortName,
			email: row.email,
			orcid: row.orcid,
			position: positions.get(row.id) ?? null,
			image: images.generateSignedImageUrl({
				key: row.imageKey,
				options: { width: imageWidth.avatar },
			}),
			slug: row.slug,
			role: row.role,
			duration: {
				start: row.duration.start.toISOString(),
				end: row.duration.end?.toISOString() ?? null,
			},
		});
	}

	for (const [governanceBodyId, items] of personsByGovernanceBody) {
		const sorted = [...items].sort((a, b) => {
			const byName = a.sortName.localeCompare(b.sortName);
			if (byName !== 0) return byName;
			return a.role.localeCompare(b.role);
		});
		personsByGovernanceBody.set(governanceBodyId, sorted);
	}

	return personsByGovernanceBody;
}

export async function getGovernanceBodies(
	db: Database | Transaction,
	params: GetGovernanceBodiesParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.organisationalUnits.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
				type: {
					type: "governance_body",
				},
			},
			columns: {
				id: true,
				name: true,
				acronym: true,
				summary: true,
				metadata: true,
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
			.from(schema.organisationalUnits)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, "governance_body"),
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const personsByGovernanceBody = await getActiveGovernanceBodyPersons(
		db,
		items.map((item) => {
			return item.id;
		}),
	);

	const data = items.map((item) => {
		const image =
			item.image != null
				? images.generateSignedImageUrl({
						key: item.image.key,
						options: { width: imageWidth.preview },
					})
				: null;

		return {
			...item,
			image,
			socialMedia: mapSocialMedia(item.socialMedia),
			persons: personsByGovernanceBody.get(item.id) ?? [],
			publishedAt: item.entity.updatedAt.toISOString(),
		};
	});

	return { data, limit, offset, total };
}

interface GetGovernanceBodyByIdParams {
	id: schema.OrganisationalUnit["id"];
}

export async function getGovernanceBodyById(
	db: Database | Transaction,
	params: GetGovernanceBodyByIdParams,
) {
	const { id } = params;

	const [item, fields, relatedEntities, relatedResources, personsByGovernanceBody] =
		await Promise.all([
			db.query.organisationalUnits.findFirst({
				where: {
					id,
					entity: {
						status: {
							type: "published",
						},
					},
					type: {
						type: "governance_body",
					},
				},
				columns: {
					id: true,
					name: true,
					acronym: true,
					summary: true,
					metadata: true,
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
			getRelatedEntities(db, id),
			getRelatedResources(db, id),
			getActiveGovernanceBodyPersons(db, [id]),
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

	return {
		...item,
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		persons: personsByGovernanceBody.get(item.id) ?? [],
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}

interface GetGovernanceBodySlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getGovernanceBodySlugs(
	db: Database | Transaction,
	params: GetGovernanceBodySlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.organisationalUnits.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
				type: {
					type: "governance_body",
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
			.from(schema.organisationalUnits)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					eq(schema.organisationalUnitTypes.type, "governance_body"),
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	return { data: items, limit, offset, total };
}

interface GetGovernanceBodyBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getGovernanceBodyBySlug(
	db: Database | Transaction,
	params: GetGovernanceBodyBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.organisationalUnits.findFirst({
		where: {
			entity: {
				slug,
				status: {
					type: "published",
				},
			},
			type: {
				type: "governance_body",
			},
		},
		columns: {
			id: true,
			name: true,
			acronym: true,
			summary: true,
			metadata: true,
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

	const [fields, relatedEntities, relatedResources, personsByGovernanceBody] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
		getActiveGovernanceBodyPersons(db, [item.id]),
	]);

	const image =
		item.image != null
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	return {
		...item,
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		persons: personsByGovernanceBody.get(item.id) ?? [],
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}
