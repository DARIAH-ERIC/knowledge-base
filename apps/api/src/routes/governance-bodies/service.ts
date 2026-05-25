/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { flattenEntityVersion } from "@/lib/entity-version";
import { generateImageUrl } from "@/lib/images";
import { getPersonPositions } from "@/lib/persons";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import { mapSocialMedia } from "@/lib/social-media";
import type { Database, Transaction } from "@/middlewares/db";
import { hardcodedWorkingGroups } from "@/routes/governance-bodies/hardcoded-working-groups";
import { and, count, eq, inArray, sql } from "@/services/db/sql";
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

const hardcodedWorkingGroupsGovernanceBody = {
	id: "019b7a56-b301-7f93-9d24-91333bdc3ca8",
	name: "working groups",
	acronym: null,
	summary:
		"Self-organised communities of practice within DARIAH which contribute to bringing together state-of-art digital arts and humanities activities and scaling their results to a European level.",
	metadata: {},
	image: null,
	entity: { slug: "working-groups" },
	publishedAt: "2026-01-01T00:00:00.000Z",
	socialMedia: [],
};

async function getActiveWorkingGroupChairs(db: Database | Transaction) {
	const rows = await db
		.select({
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
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.personsToOrganisationalUnits.organisationalUnitId, schema.organisationalUnits.id),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.innerJoin(schema.persons, eq(schema.personsToOrganisationalUnits.personId, schema.persons.id))
		.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
		)
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.where(
			and(
				eq(schema.personRoleTypes.type, "is_chair_of"),
				eq(schema.organisationalUnitTypes.type, "working_group"),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const positions = await getPersonPositions(db, [...new Set(rows.map((row) => row.id))]);
	const chairsByPerson = new Map<string, GovernanceBodyPerson>();

	for (const row of rows) {
		if (chairsByPerson.has(row.id)) {
			continue;
		}

		chairsByPerson.set(row.id, {
			id: row.id,
			name: row.name,
			sortName: row.sortName,
			email: row.email,
			orcid: row.orcid,
			position: positions.get(row.id) ?? null,
			image: generateImageUrl({ key: row.imageKey }, imageWidth.avatar),
			slug: row.slug,
			role: row.role,
			duration: {
				start: row.duration.start.toISOString(),
				end: row.duration.end?.toISOString() ?? null,
			},
		});
	}

	return [...chairsByPerson.values()].toSorted((a, b) => {
		const byName = a.sortName.localeCompare(b.sortName);
		if (byName !== 0) {
			return byName;
		}
		return a.name.localeCompare(b.name);
	});
}

async function getHardcodedWorkingGroupsGovernanceBody(db: Database | Transaction) {
	return {
		...hardcodedWorkingGroupsGovernanceBody,
		persons: await getActiveWorkingGroupChairs(db),
	};
}

async function getHardcodedWorkingGroupsGovernanceBodyDetails(db: Database | Transaction) {
	return {
		...(await getHardcodedWorkingGroupsGovernanceBody(db)),
		description: hardcodedWorkingGroups.description,
		relatedEntities: [],
		relatedResources: [],
	};
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
		.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
		)
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.where(
			and(
				inArray(schema.personsToOrganisationalUnits.organisationalUnitId, governanceBodyIds),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const positions = await getPersonPositions(db, [...new Set(rows.map((row) => row.id))]);

	for (const row of rows) {
		const items = personsByGovernanceBody.get(row.governanceBodyId);

		if (items == null) {
			continue;
		}

		items.push({
			id: row.id,
			name: row.name,
			sortName: row.sortName,
			email: row.email,
			orcid: row.orcid,
			position: positions.get(row.id) ?? null,
			image: generateImageUrl({ key: row.imageKey }, imageWidth.avatar),
			slug: row.slug,
			role: row.role,
			duration: {
				start: row.duration.start.toISOString(),
				end: row.duration.end?.toISOString() ?? null,
			},
		});
	}

	for (const [governanceBodyId, items] of personsByGovernanceBody) {
		const sorted = items.toSorted((a, b) => {
			const byName = a.sortName.localeCompare(b.sortName);
			if (byName !== 0) {
				return byName;
			}
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
				entityVersion: {
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
				return [desc(sql`"entityVersion"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(eq(schema.organisationalUnitTypes.type, "governance_body")),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const personsByGovernanceBody = await getActiveGovernanceBodyPersons(
		db,
		items.map((item) => item.id),
	);

	const data = items.map((item) => {
		const image = generateImageUrl(item.image, imageWidth.preview);

		return {
			...flattenEntityVersion(item),
			image,
			socialMedia: mapSocialMedia(item.socialMedia),
			persons: personsByGovernanceBody.get(item.id) ?? [],
		};
	});

	if (offset <= total && offset + limit > total) {
		data.push(await getHardcodedWorkingGroupsGovernanceBody(db));
	}

	return { data, limit, offset, total: total + 1 };
}

interface GetGovernanceBodyByIdParams {
	id: schema.OrganisationalUnit["id"];
}

export async function getGovernanceBodyById(
	db: Database | Transaction,
	params: GetGovernanceBodyByIdParams,
) {
	const { id } = params;

	if (id === hardcodedWorkingGroupsGovernanceBody.id) {
		return getHardcodedWorkingGroupsGovernanceBodyDetails(db);
	}

	const [item, fields, relatedEntities, relatedResources, personsByGovernanceBody] =
		await Promise.all([
			db.query.organisationalUnits.findFirst({
				where: {
					id,
					entityVersion: {
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

	const image = generateImageUrl(item.image, imageWidth.featured);

	return {
		...flattenEntityVersion(item),
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		persons: personsByGovernanceBody.get(item.id) ?? [],
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
				entityVersion: {
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
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(eq(schema.organisationalUnitTypes.type, "governance_body")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map(({ id, entityVersion }) => {
		return { id, entity: { slug: entityVersion.entity.slug } };
	});

	if (offset <= total && offset + limit > total) {
		data.push({
			id: hardcodedWorkingGroupsGovernanceBody.id,
			entity: hardcodedWorkingGroupsGovernanceBody.entity,
		});
	}

	return { data, limit, offset, total: total + 1 };
}

interface GetGovernanceBodyBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getGovernanceBodyBySlug(
	db: Database | Transaction,
	params: GetGovernanceBodyBySlugParams,
) {
	const { slug } = params;

	if (slug === hardcodedWorkingGroupsGovernanceBody.entity.slug) {
		return getHardcodedWorkingGroupsGovernanceBodyDetails(db);
	}

	const item = await db.query.organisationalUnits.findFirst({
		where: {
			entityVersion: {
				status: {
					type: "published",
				},
				entity: {
					slug,
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

	const image = generateImageUrl(item.image, imageWidth.featured);

	return {
		...flattenEntityVersion(item),
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		persons: personsByGovernanceBody.get(item.id) ?? [],
		...fields,
		relatedEntities,
		relatedResources,
	};
}
