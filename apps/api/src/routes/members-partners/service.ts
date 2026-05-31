/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { type ContentBlock, getContentBlocks } from "@/lib/content-blocks";
import { flattenEntityVersion } from "@/lib/entity-version";
import { generateImageUrl } from "@/lib/images";
import { getPersonPositions } from "@/lib/persons";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import { mapSocialMedia } from "@/lib/social-media";
import type { Database, Transaction } from "@/middlewares/db";
import { type SQLWrapper, alias, and, count, eq, exists, sql } from "@/services/db/sql";
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
				entityVersion: {
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
			.from(schema.membersAndPartners)
			.innerJoin(schema.entityVersions, eq(schema.membersAndPartners.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = await Promise.all(
		items.map(async (item) => {
			const nationalConsortium =
				item.status === "is_member_of" || item.status === "is_observer_of"
					? await getNationalConsortium(db, item.id)
					: null;
			const image = nationalConsortium?.image ?? generateImageUrl(item.image, imageWidth.preview);
			const socialMedia = mapSocialMedia(item.socialMedia);

			return { ...flattenEntityVersion(item), image, socialMedia };
		}),
	);

	return { data, limit, offset, total };
}

//

function mapPersonContributors(
	rows: Array<{
		id: string;
		name: string;
		slug: string;
		imageKey: string;
		role: string;
	}>,
	positions: Map<string, Array<{ role: string; name: string; type: string }> | null>,
) {
	return rows.map(({ imageKey, role, ...row }) => {
		return {
			...row,
			position: positions.get(row.id) ?? null,
			role,
			slug: row.slug,
			image: generateImageUrl({ key: imageKey }, imageWidth.avatar),
		};
	});
}

function hasContent(block: ContentBlock): boolean {
	switch (block.type) {
		case "rich_text": {
			return hasRichTextContent(block.content);
		}
		case "accordion": {
			return block.items.length > 0;
		}
		case "hero": {
			return (
				block.title.trim().length > 0 ||
				(block.eyebrow?.trim().length ?? 0) > 0 ||
				block.image != null ||
				(block.ctas?.length ?? 0) > 0
			);
		}
		case "data":
		case "embed":
		case "image": {
			return true;
		}
	}
}

function hasRichTextContent(content: unknown): boolean {
	if (typeof content === "string") {
		return content.trim().length > 0;
	}

	if (Array.isArray(content)) {
		return content.some((item) => hasRichTextContent(item));
	}

	if (content != null && typeof content === "object") {
		const value = content as { content?: unknown; text?: unknown };

		if (typeof value.text === "string") {
			return value.text.trim().length > 0;
		}

		return hasRichTextContent(value.content);
	}

	return false;
}

function hasContentBlocks(blocks: Array<ContentBlock> | undefined): blocks is Array<ContentBlock> {
	return blocks?.some((block) => hasContent(block)) === true;
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

	// Unit↔unit relations are document-level; the related unit is resolved from its document id to
	// any of its versions to check the related type. idRef is a version id of the owning unit.
	const relatedUnitVersion = alias(schema.entityVersions, "exists_related_unit_version");

	return exists(
		db
			.select({ one: sql<number>`1` })
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
			)
			.innerJoin(
				relatedUnitVersion,
				eq(relatedUnitVersion.entityId, schema.organisationalUnitsRelations.relatedUnitDocumentId),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, relatedUnitVersion.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					sql`${schema.organisationalUnitsRelations.unitDocumentId} = (SELECT ${schema.entityVersions.entityId} FROM ${schema.entityVersions} WHERE ${schema.entityVersions.id} = ${idRef})`,
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

	// Unit↔unit relations are document-level; idRef and relatedUnitId are version ids resolved to
	// their document ids, and the related unit's type is checked via any of its versions.
	const relatedUnitVersion = alias(schema.entityVersions, "exists_to_unit_related_version");

	return exists(
		db
			.select({ one: sql<number>`1` })
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
			)
			.innerJoin(
				relatedUnitVersion,
				eq(relatedUnitVersion.entityId, schema.organisationalUnitsRelations.relatedUnitDocumentId),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, relatedUnitVersion.id),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					sql`${schema.organisationalUnitsRelations.unitDocumentId} = (SELECT ${schema.entityVersions.entityId} FROM ${schema.entityVersions} WHERE ${schema.entityVersions.id} = ${idRef})`,
					sql`${schema.organisationalUnitsRelations.relatedUnitDocumentId} = (SELECT ${schema.entityVersions.entityId} FROM ${schema.entityVersions} WHERE ${schema.entityVersions.id} = ${relatedUnitId})`,
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
			entityVersion: {
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
			ror: true,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: { slug: true },
					},
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
		ror: string | null;
		entityVersion: {
			entity: {
				slug: string;
			};
		};
		socialMedia: Array<{
			url: string;
			type: {
				type: string;
			};
		}>;
	}>;

	return items.map((item) => {
		const website = item.socialMedia.find((sm) => sm.type.type === "website")?.url ?? null;

		return {
			name: item.name,
			ror: item.ror,
			slug: item.entityVersion.entity.slug,
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
			entityVersion: {
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
			ror: true,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: { slug: true },
					},
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
		ror: string | null;
		entityVersion: {
			entity: {
				slug: string;
			};
		};
		socialMedia: Array<{
			url: string;
			type: {
				type: string;
			};
		}>;
	}>;

	return items.map((item) => {
		const website = item.socialMedia.find((sm) => sm.type.type === "website")?.url ?? null;

		return {
			name: item.name,
			ror: item.ror,
			slug: item.entityVersion.entity.slug,
			website,
		};
	});
}

async function getNationalConsortium(
	db: Database | Transaction,
	countryId: string,
	options?: { imageSize?: number; includeDescription?: boolean },
) {
	const item = await db.query.organisationalUnits.findFirst({
		where: {
			entityVersion: {
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
			entityVersion: {
				columns: { id: true },
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
		},
	});

	if (item == null) {
		return null;
	}

	const fields =
		options?.includeDescription === true ? await getContentBlocks(db, item.entityVersion.id) : {};

	return {
		name: item.name,
		slug: item.entityVersion.entity.slug,
		image: generateImageUrl(item.image, options?.imageSize ?? imageWidth.preview),
		description: fields.description,
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
		// person↔org relations are document-level; resolve the person to its published version and
		// match the org by its document id (countryId is a published org version id).
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.documentLifecycle.publishedId))
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.where(
			and(
				sql`${schema.personsToOrganisationalUnits.organisationalUnitDocumentId} = (SELECT ${schema.entityVersions.entityId} FROM ${schema.entityVersions} WHERE ${schema.entityVersions.id} = ${countryId})`,
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
		rows.map((row) => row.id),
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

	const [item, fields, relatedEntities, relatedResources] = await Promise.all([
		db.query.membersAndPartners.findFirst({
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
				metadata: true,
				name: true,
				summary: true,
				status: true,
				type: true,
				sshocMarketplaceActorId: true,
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
	]);

	if (item == null) {
		return null;
	}

	const includeCountryRelations =
		item.status === "is_member_of" || item.status === "is_observer_of";
	const includeInstitutions =
		includeCountryRelations || item.status === "is_cooperating_partner_of";

	const institutionsPromise =
		item.status === "is_cooperating_partner_of"
			? getCooperatingPartnerInstitutions(db, item.id)
			: getMemberObserverInstitutions(db, item.id);

	const [institutions, contributors, nationalConsortium] = await Promise.all([
		includeInstitutions ? institutionsPromise : Promise.resolve([]),
		includeCountryRelations ? getContributors(db, item.id) : Promise.resolve([]),
		includeCountryRelations
			? getNationalConsortium(db, item.id, {
					imageSize: imageWidth.featured,
					includeDescription: true,
				})
			: Promise.resolve(null),
	]);

	const image = nationalConsortium?.image ?? generateImageUrl(item.image, imageWidth.featured);
	const description = hasContentBlocks(nationalConsortium?.description)
		? nationalConsortium.description
		: fields.description;

	return {
		...flattenEntityVersion(item),
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		institutions,
		contributors,
		nationalConsortium,
		...fields,
		description,
		relatedEntities,
		relatedResources,
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
				image: {
					columns: {
						key: true,
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
			.from(schema.membersAndPartners)
			.innerJoin(schema.entityVersions, eq(schema.membersAndPartners.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map(({ id, entityVersion }) => {
		return { id, entity: { slug: entityVersion.entity.slug } };
	});

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
			metadata: true,
			name: true,
			summary: true,
			status: true,
			type: true,
			sshocMarketplaceActorId: true,
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

	const includeCountryRelations =
		item.status === "is_member_of" || item.status === "is_observer_of";
	const includeInstitutions =
		includeCountryRelations || item.status === "is_cooperating_partner_of";
	const institutionsPromise =
		item.status === "is_cooperating_partner_of"
			? getCooperatingPartnerInstitutions(db, item.id)
			: getMemberObserverInstitutions(db, item.id);
	const [
		fields,
		institutions,
		contributors,
		nationalConsortium,
		relatedEntities,
		relatedResources,
	] = await Promise.all([
		getContentBlocks(db, item.id),
		includeInstitutions ? institutionsPromise : Promise.resolve([]),
		includeCountryRelations ? getContributors(db, item.id) : Promise.resolve([]),
		includeCountryRelations
			? getNationalConsortium(db, item.id, {
					imageSize: imageWidth.featured,
					includeDescription: true,
				})
			: Promise.resolve(null),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	const image = nationalConsortium?.image ?? generateImageUrl(item.image, imageWidth.featured);
	const description = hasContentBlocks(nationalConsortium?.description)
		? nationalConsortium.description
		: fields.description;

	return {
		...flattenEntityVersion(item),
		image,
		socialMedia: mapSocialMedia(item.socialMedia),
		institutions,
		contributors,
		nationalConsortium,
		...fields,
		description,
		relatedEntities,
		relatedResources,
	};
}
