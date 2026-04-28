/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq, exists, sql, type SQLWrapper } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getPersonPositions } from "@/lib/persons";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetMembersAndPartnersParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getMembersAndPartners(
	db: Database | Transaction,
	params: GetMembersAndPartnersParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.membersAndPartners.findMany({
			where: {
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
				status: true,
				type: true,
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
			.from(schema.membersAndPartners)
			.innerJoin(schema.entities, eq(schema.membersAndPartners.id, schema.entities.id))
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

function mapSocialMedia(
	socialMedia: Array<{
		id: string;
		name: string;
		url: string;
		duration: { start: Date; end?: Date | null } | null;
		type: { type: string };
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

function mapPersonContributors(
	rows: Array<{
		id: string;
		name: string;
		slug: string;
		imageKey: string;
		role: string;
	}>,
	positions: Map<string, Array<{ role: string; name: string }> | null>,
) {
	return rows.map(({ imageKey, role, ...row }) => {
		return {
			...row,
			position: positions.get(row.id) ?? null,
			role,
			slug: row.slug,
			image: images.generateSignedImageUrl({
				key: imageKey,
				options: { width: imageWidth.avatar },
			}),
		};
	});
}

function buildActiveRelationExistsFilter(
	db: Database | Transaction,
	idRef: string | SQLWrapper,
	status:
		| "is_member_of"
		| "is_observer_of"
		| "is_partner_institution_of"
		| "is_located_in"
		| "is_national_consortium_of"
		| "is_cooperating_partner_of",
	relatedType: "eric" | "country",
) {
	const durationContainsNow = sql`
		${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ
	`;

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
					eq(schema.organisationalUnitStatus.status, status),
					eq(schema.organisationalUnitTypes.type, relatedType),
					durationContainsNow,
				),
			),
	);
}

function buildActiveRelationToUnitFilter(
	db: Database | Transaction,
	idRef: string | SQLWrapper,
	status:
		| "is_member_of"
		| "is_observer_of"
		| "is_partner_institution_of"
		| "is_located_in"
		| "is_national_consortium_of"
		| "is_cooperating_partner_of",
	relatedType: "eric" | "country",
	relatedUnitId: string | SQLWrapper,
) {
	const durationContainsNow = sql`
		${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ
	`;

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
					eq(schema.organisationalUnitsRelations.relatedUnitId, relatedUnitId),
					eq(schema.organisationalUnitStatus.status, status),
					eq(schema.organisationalUnitTypes.type, relatedType),
					durationContainsNow,
				),
			),
	);
}

async function getMemberObserverInstitutions(
	db: Database | Transaction,
	countryId: schema.OrganisationalUnit["id"],
) {
	const items = (await db.query.organisationalUnits.findMany({
		where: {
			entity: {
				status: {
					type: "published",
				},
			},
			type: {
				type: "institution",
			},
			RAW(t) {
				return and(
					buildActiveRelationExistsFilter(db, t.id, "is_partner_institution_of", "eric"),
					buildActiveRelationToUnitFilter(db, t.id, "is_located_in", "country", countryId),
				)!;
			},
		},
		columns: {
			name: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
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
		},
		orderBy(t, { asc }) {
			return [asc(t.name)];
		},
	})) as unknown as Array<{
		name: string;
		entity: {
			slug: string;
		};
		socialMedia: Array<{
			url: string;
			type: {
				type: string;
			};
		}>;
	}>;

	return items.map((item) => {
		const website =
			item.socialMedia.find((sm) => {
				return sm.type.type === "website";
			})?.url ?? null;

		return {
			name: item.name,
			slug: item.entity.slug,
			website,
		};
	});
}

async function getCooperatingPartnerInstitutions(
	db: Database | Transaction,
	countryId: schema.OrganisationalUnit["id"],
) {
	const items = (await db.query.organisationalUnits.findMany({
		where: {
			entity: {
				status: {
					type: "published",
				},
			},
			type: {
				type: "institution",
			},
			RAW(t) {
				return and(
					buildActiveRelationExistsFilter(db, t.id, "is_cooperating_partner_of", "eric"),
					buildActiveRelationToUnitFilter(db, t.id, "is_located_in", "country", countryId),
				)!;
			},
		},
		columns: {
			name: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
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
		},
		orderBy(t, { asc }) {
			return [asc(t.name)];
		},
	})) as unknown as Array<{
		name: string;
		entity: {
			slug: string;
		};
		socialMedia: Array<{
			url: string;
			type: {
				type: string;
			};
		}>;
	}>;

	return items.map((item) => {
		const website =
			item.socialMedia.find((sm) => {
				return sm.type.type === "website";
			})?.url ?? null;

		return {
			name: item.name,
			slug: item.entity.slug,
			website,
		};
	});
}

async function getNationalConsortium(db: Database | Transaction, countryId: string) {
	const item = await db.query.organisationalUnits.findFirst({
		where: {
			entity: {
				status: {
					type: "published",
				},
			},
			type: {
				type: "national_consortium",
			},
			RAW(t) {
				return buildActiveRelationToUnitFilter(
					db,
					t.id,
					"is_national_consortium_of",
					"country",
					countryId,
				);
			},
		},
		columns: {
			name: true,
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

	return {
		name: item.name,
		slug: item.entity.slug,
		image:
			item.image != null
				? images.generateSignedImageUrl({
						key: item.image.key,
						options: { width: imageWidth.preview },
					})
				: null,
	};
}

async function getContributors(db: Database | Transaction, countryId: string) {
	const rows = await db
		.select({
			id: schema.persons.id,
			name: schema.persons.name,
			slug: schema.entities.slug,
			imageKey: schema.assets.key,
			role: schema.personRoleTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(schema.persons, eq(schema.personsToOrganisationalUnits.personId, schema.persons.id))
		.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.where(
			and(
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, countryId),
				eq(schema.entityStatus.type, "published"),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
				sql`
					${schema.personRoleTypes.type} IN (
						'national_coordinator',
						'national_coordinator_deputy',
						'national_representative',
						'national_representative_deputy'
					)
				`,
			),
		);

	const positions = await getPersonPositions(
		db,
		rows.map((row) => {
			return row.id;
		}),
	);

	return mapPersonContributors(rows, positions);
}

interface GetMemberOrPartnerByIdParams {
	id: schema.OrganisationalUnit["id"];
}

export async function getMemberOrPartnerById(
	db: Database | Transaction,
	params: GetMemberOrPartnerByIdParams,
) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.membersAndPartners.findFirst({
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
				status: true,
				type: true,
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
	]);

	if (item == null) {
		return null;
	}

	const includeCountryRelations =
		item.status === "is_member_of" || item.status === "is_observer_of";
	const includeInstitutions =
		includeCountryRelations || item.status === "is_cooperating_partner_of";

	const image =
		item.image != null
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	const institutionsPromise =
		item.status === "is_cooperating_partner_of"
			? getCooperatingPartnerInstitutions(db, item.id)
			: getMemberObserverInstitutions(db, item.id);

	const [institutions, contributors, nationalConsortium] = await Promise.all([
		includeInstitutions ? institutionsPromise : Promise.resolve([]),
		includeCountryRelations ? getContributors(db, item.id) : Promise.resolve([]),
		includeCountryRelations ? getNationalConsortium(db, item.id) : Promise.resolve(null),
	]);

	return {
		...item,
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		institutions,
		contributors,
		nationalConsortium,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}

//

interface GetMemberOrPartnerSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getMemberOrPartnerSlugs(
	db: Database | Transaction,
	params: GetMemberOrPartnerSlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.membersAndPartners.findMany({
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
			.from(schema.membersAndPartners)
			.innerJoin(schema.entities, eq(schema.membersAndPartners.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetMemberOrPartnerBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getMemberOrPartnerBySlug(
	db: Database | Transaction,
	params: GetMemberOrPartnerBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.membersAndPartners.findFirst({
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
			status: true,
			type: true,
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

	const includeCountryRelations =
		item.status === "is_member_of" || item.status === "is_observer_of";
	const includeInstitutions =
		includeCountryRelations || item.status === "is_cooperating_partner_of";
	const institutionsPromise =
		item.status === "is_cooperating_partner_of"
			? getCooperatingPartnerInstitutions(db, item.id)
			: getMemberObserverInstitutions(db, item.id);
	const [fields, institutions, contributors, nationalConsortium] = await Promise.all([
		getContentBlocks(db, item.id),
		includeInstitutions ? institutionsPromise : Promise.resolve([]),
		includeCountryRelations ? getContributors(db, item.id) : Promise.resolve([]),
		includeCountryRelations ? getNationalConsortium(db, item.id) : Promise.resolve(null),
	]);

	return {
		...item,
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		institutions,
		contributors,
		nationalConsortium,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}
