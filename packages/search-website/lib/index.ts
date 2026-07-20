import { log } from "@acdh-oeaw/lib";
import type { Database } from "@dariah-eric/database";
import {
	annotatePlaceholderValues,
	collectPlaceholderValueKinds,
} from "@dariah-eric/database/placeholder-values";
import { getPlaceholderValues } from "@dariah-eric/database/placeholder-values-service";
import * as schema from "@dariah-eric/database/schema";
import { alias, and, eq, inArray, sql } from "@dariah-eric/database/sql";
import type { SearchService, WebsiteDocument, WebsiteEntityDocument } from "@dariah-eric/search";
import type { SearchAdminService } from "@dariah-eric/search/admin";
import { getEntityHref, resolveInterimPagePath } from "@dariah-eric/website-routes";

import { toPlainText } from "./json-content/to-plain-text";

export type SupportedWebsiteEntityType =
	| "country"
	| "document-or-policy"
	| "event"
	| "funding-call"
	| "governance-body"
	| "impact-case-study"
	| "institution"
	| "national-consortium"
	| "news-item"
	| "opportunity"
	| "page"
	| "person"
	| "project"
	| "spotlight-article"
	| "working-group";

/**
 * Identifies the search documents belonging to one knowledge-base document (entity). Captured
 * before an entity is deleted, so its documents can still be removed afterwards.
 *
 * `entityId` is the entity (document) id — never an entity _version_ id. Every function in this
 * module that takes an `entityId` uses that same convention.
 */
export interface WebsiteDocumentDescriptor {
	entityId: string;
	slug: string;
	type: SupportedWebsiteEntityType;
}

export interface SyncWebsiteDocumentResult {
	entityId: string;
	upsertedDocumentIds: Array<string>;
	deletedDocumentIds: Array<string>;
	errors?: Array<unknown>;
	ok: boolean;
	operation: "deleted" | "skipped" | "synced";
}

export interface CreateWebsiteSearchIndexServiceParams {
	db: Database;
	search: SearchAdminService;
	searchService: SearchService;
}

export interface SyncWebsiteSearchIndexResult {
	count: number;
	failedCount: number;
}

type CanonicalWebsiteEntityType =
	| "country"
	| "document-or-policy"
	| "event"
	| "funding-call"
	| "governance-body"
	| "impact-case-study"
	| "institution"
	| "national-consortium"
	| "news-item"
	| "opportunity"
	| "page"
	| "person"
	| "project"
	| "spotlight-article"
	| "working-group";

export const supportedWebsiteEntityTypes = [
	"country",
	"document-or-policy",
	"event",
	"funding-call",
	"governance-body",
	"impact-case-study",
	"institution",
	"national-consortium",
	"news-item",
	"opportunity",
	"page",
	"person",
	"project",
	"spotlight-article",
	"working-group",
] as const satisfies Array<SupportedWebsiteEntityType>;

function createWebsiteDocumentId(descriptor: WebsiteDocumentDescriptor): string {
	return [descriptor.type, descriptor.slug].join(":");
}

function mergeDescription(...values: Array<string | null | undefined>): string {
	const parts = values
		.map((value) => value?.trim())
		.filter((value): value is string => value != null && value.length > 0);

	return [...new Set(parts)].join("\n\n");
}

function createWebsiteEntityDocument(params: {
	description: string;
	documentId?: string;
	entityId: string;
	importedAt: number;
	label: string;
	link: string;
	sourceId: string;
	sourceUpdatedAt: Date;
	type: CanonicalWebsiteEntityType;
}): WebsiteEntityDocument {
	const {
		description,
		entityId,
		importedAt,
		label,
		link,
		sourceId,
		documentId = sourceId,
		sourceUpdatedAt,
		type,
	} = params;

	return {
		kind: "entity",
		entity_id: entityId,
		source: "dariah-knowledge-base",
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt.getTime(),
		imported_at: importedAt,
		type,
		id: [type, documentId].join(":"),
		label,
		description,
		link,
	};
}

function isMissingSearchDocumentError(error: unknown): boolean {
	if (typeof error !== "object" || error == null) {
		return false;
	}

	const cause = "cause" in error ? error.cause : undefined;

	if (typeof cause !== "object" || cause == null) {
		return false;
	}

	if ("httpStatus" in cause && cause.httpStatus === 404) {
		return true;
	}

	if ("message" in cause && typeof cause.message === "string") {
		return cause.message.includes("Not Found") || cause.message.includes("Could not find");
	}

	return false;
}

/** Keyed by entity _version_ id — content blocks hang off a version, not off the document. */
async function getPlainTextFieldContentByVersionId(
	db: Database,
	versionIds: Array<string>,
	fieldName: string,
): Promise<Map<string, string>> {
	if (versionIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({
			versionId: schema.fields.entityVersionId,
			blockType: schema.contentBlockTypes.type,
			richTextContent: schema.richTextContentBlocks.content,
			calloutTitle: schema.calloutContentBlocks.title,
			calloutContent: schema.calloutContentBlocks.content,
		})
		.from(schema.fields)
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.contentBlockTypes,
			eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
		)
		.leftJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.leftJoin(
			schema.calloutContentBlocks,
			eq(schema.calloutContentBlocks.id, schema.contentBlocks.id),
		)
		.where(
			and(
				inArray(schema.fields.entityVersionId, versionIds),
				eq(schema.entityTypesFieldsNames.fieldName, fieldName),
				inArray(schema.contentBlockTypes.type, ["rich_text", "callout"]),
			),
		)
		.orderBy(schema.fields.entityVersionId, schema.contentBlocks.position);

	// Attach current placeholder-value data before flattening so the indexed text contains the
	// actual values (stale until the entity's next sync, like every other indexed field).
	const placeholderValueKinds = collectPlaceholderValueKinds(rows);
	const annotatedRows =
		placeholderValueKinds.size > 0
			? annotatePlaceholderValues(rows, await getPlaceholderValues(db, placeholderValueKinds))
			: rows;

	const contentByVersionId = new Map<string, Array<string>>();

	for (const row of annotatedRows) {
		const content =
			row.blockType === "callout"
				? [row.calloutTitle, toPlainText(row.calloutContent)]
						.filter((part): part is string => part != null && part.length > 0)
						.join(" ")
				: toPlainText(row.richTextContent);

		if (content.length === 0) {
			continue;
		}

		const existing = contentByVersionId.get(row.versionId) ?? [];
		existing.push(content);
		contentByVersionId.set(row.versionId, existing);
	}

	return new Map(
		[...contentByVersionId.entries()].map(([versionId, parts]) => [
			versionId,
			mergeDescription(...parts),
		]),
	);
}

const countryEntities = alias(schema.entities, "country_entities");
const countryEntityVersions = alias(schema.entityVersions, "country_entity_versions");
const itemEntities = alias(schema.entities, "item_entities");
const itemEntityVersions = alias(schema.entityVersions, "item_entity_versions");
const organisationalRelationStatus = alias(
	schema.organisationalUnitStatus,
	"organisational_relation_status",
);
const organisationalUnitType = alias(schema.organisationalUnitTypes, "organisational_unit_type");
const publishedEntityStatus = alias(schema.entityStatus, "published_entity_status");

interface CountryScopedUnit {
	countrySlug: string;
	description: string | null;
	entityId: string;
	itemSlug: string;
	label: string;
	sourceUpdatedAt: Date;
	versionId: string;
}

/**
 * Units that are shown on a member/partner country page and have no detail page of their own, so
 * they are indexed once per country they belong to (document id `<type>:<country>:<unit>`).
 *
 * Shared by the full and the per-entity sync — passing `entityId` narrows the same query to one
 * document, which keeps the two paths from drifting apart.
 */
async function getCountryScopedUnits(
	db: Database,
	params: {
		entityId?: string;
		ericRelationStatus?: "is_cooperating_partner_of" | "is_partner_institution_of";
		relationStatus: "is_located_in" | "is_national_consortium_of";
		unitType: "institution" | "national_consortium";
	},
): Promise<Array<CountryScopedUnit>> {
	const { entityId, ericRelationStatus, relationStatus, unitType } = params;

	const conditions = [
		eq(publishedEntityStatus.type, "published"),
		eq(organisationalUnitType.type, unitType),
		eq(organisationalRelationStatus.status, relationStatus),
		sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
	];

	if (entityId != null) {
		conditions.push(eq(itemEntities.id, entityId));
	}

	if (ericRelationStatus != null) {
		conditions.push(sql`
			EXISTS (
				SELECT
					1
				FROM
					${schema.organisationalUnitsRelations} eric_relations
					INNER JOIN ${schema.organisationalUnitStatus} eric_relation_status ON eric_relations.status = eric_relation_status.id
					INNER JOIN ${schema.entityVersions} eric_related_v ON eric_related_v.entity_id = eric_relations.related_unit_document_id
					INNER JOIN ${schema.organisationalUnits} related_units ON related_units.id = eric_related_v.id
					INNER JOIN ${schema.organisationalUnitTypes} related_unit_types ON related_units.type_id = related_unit_types.id
				WHERE
					eric_relations.unit_document_id = ${itemEntities.id}
					AND eric_relation_status.status = ${ericRelationStatus}
					AND related_unit_types.type = 'eric'
					AND eric_relations.duration @> NOW()::TIMESTAMPTZ
			)
		`);
	}

	return db
		.select({
			versionId: schema.organisationalUnits.id,
			entityId: itemEntities.id,
			countrySlug: countryEntities.slug,
			itemSlug: itemEntities.slug,
			label: schema.organisationalUnits.name,
			description: schema.organisationalUnits.summary,
			sourceUpdatedAt: schema.organisationalUnits.updatedAt,
		})
		.from(schema.organisationalUnits)
		.innerJoin(itemEntityVersions, eq(schema.organisationalUnits.id, itemEntityVersions.id))
		.innerJoin(itemEntities, eq(itemEntityVersions.entityId, itemEntities.id))
		.innerJoin(publishedEntityStatus, eq(itemEntityVersions.statusId, publishedEntityStatus.id))
		.innerJoin(
			organisationalUnitType,
			eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
		)
		.innerJoin(
			schema.organisationalUnitsRelations,
			// unit↔unit relations are document-level; the owner unit is pinned to its published version.
			eq(schema.organisationalUnitsRelations.unitDocumentId, itemEntities.id),
		)
		.innerJoin(
			organisationalRelationStatus,
			eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
		)
		.innerJoin(
			countryEntities,
			eq(countryEntities.id, schema.organisationalUnitsRelations.relatedUnitDocumentId),
		)
		.innerJoin(countryEntityVersions, eq(countryEntityVersions.entityId, countryEntities.id))
		.innerJoin(
			schema.membersAndPartners,
			eq(schema.membersAndPartners.id, countryEntityVersions.id),
		)
		.where(and(...conditions));
}

/** Unit types that are indexed; the ones left out are not shown on the website on their own. */
const websiteTypeByUnitType: Partial<
	Record<(typeof schema.organisationalUnitTypesEnum)[number], SupportedWebsiteEntityType>
> = {
	country: "country",
	governance_body: "governance-body",
	institution: "institution",
	national_consortium: "national-consortium",
	working_group: "working-group",
};

/** The country-scoped document sets, in the order they are appended to the index. */
const countryScopedUnitQueries = [
	{
		type: "national-consortium",
		params: {
			relationStatus: "is_national_consortium_of",
			unitType: "national_consortium",
		},
	},
	{
		type: "institution",
		params: {
			ericRelationStatus: "is_partner_institution_of",
			relationStatus: "is_located_in",
			unitType: "institution",
		},
	},
	{
		type: "institution",
		params: {
			ericRelationStatus: "is_cooperating_partner_of",
			relationStatus: "is_located_in",
			unitType: "institution",
		},
	},
] as const satisfies Array<{
	type: CanonicalWebsiteEntityType;
	params: Parameters<typeof getCountryScopedUnits>[1];
}>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createWebsiteSearchIndexService(params: CreateWebsiteSearchIndexServiceParams) {
	const { db, search, searchService } = params;

	async function getWebsiteDocumentDescriptorByEntityId(
		entityId: string,
	): Promise<WebsiteDocumentDescriptor | null> {
		const entity = await db.query.entities.findFirst({
			where: {
				id: entityId,
			},
			columns: {
				slug: true,
			},
			with: {
				type: {
					columns: {
						type: true,
					},
				},
			},
		});

		if (entity == null) {
			return null;
		}

		switch (entity.type.type) {
			case "documents_policies": {
				return { entityId, slug: entity.slug, type: "document-or-policy" };
			}
			case "events": {
				return { entityId, slug: entity.slug, type: "event" };
			}
			case "funding_calls": {
				return { entityId, slug: entity.slug, type: "funding-call" };
			}
			case "impact_case_studies": {
				return { entityId, slug: entity.slug, type: "impact-case-study" };
			}
			case "news": {
				return { entityId, slug: entity.slug, type: "news-item" };
			}
			case "opportunities": {
				return { entityId, slug: entity.slug, type: "opportunity" };
			}
			case "pages": {
				return { entityId, slug: entity.slug, type: "page" };
			}
			case "persons": {
				return { entityId, slug: entity.slug, type: "person" };
			}
			case "projects": {
				return { entityId, slug: entity.slug, type: "project" };
			}
			case "spotlight_articles": {
				return { entityId, slug: entity.slug, type: "spotlight-article" };
			}
			case "organisational_units": {
				// Classify by unit type rather than by the members-and-partners / working-groups views,
				// so institutions and national consortia are recognised too. Whether a unit actually
				// warrants a document is decided when its documents are built.
				const unit = await db.query.organisationalUnits.findFirst({
					where: {
						entityVersion: {
							entityId,
						},
					},
					columns: {},
					with: {
						type: {
							columns: {
								type: true,
							},
						},
					},
				});

				const type = unit == null ? undefined : websiteTypeByUnitType[unit.type.type];

				if (type == null) {
					return null;
				}

				return { entityId, slug: entity.slug, type };
			}
			case "documentation_pages": {
				return null;
			}
			case "internal_pages": {
				return null;
			}
		}
	}

	async function getSyncableWebsiteEntityIds(): Promise<Array<string>> {
		return getSyncableWebsiteEntityIdsByType();
	}

	/** The subtype tables are keyed by version id; the sync API speaks document ids. */
	async function toEntityIds(versionIds: Array<string>): Promise<Array<string>> {
		if (versionIds.length === 0) {
			return [];
		}

		const rows = await db
			.select({ entityId: schema.entityVersions.entityId })
			.from(schema.entityVersions)
			.where(inArray(schema.entityVersions.id, versionIds));

		return rows.map((row) => row.entityId);
	}

	/** Returns entity (document) ids — see {@link WebsiteDocumentDescriptor}. */
	async function getSyncableWebsiteEntityIdsByType(
		entityType?: SupportedWebsiteEntityType,
	): Promise<Array<string>> {
		switch (entityType) {
			case "institution":
			case "national-consortium": {
				const groups = await Promise.all(
					countryScopedUnitQueries
						.filter((query) => query.type === entityType)
						.map((query) => getCountryScopedUnits(db, query.params)),
				);

				return [...new Set(groups.flat().map((item) => item.entityId))];
			}

			case "governance-body": {
				const items = await db.query.organisationalUnits.findMany({
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
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "country": {
				const items = await db.query.membersAndPartners.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "document-or-policy": {
				const items = await db.query.documentsPolicies.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "event": {
				const items = await db.query.events.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "funding-call": {
				const items = await db.query.fundingCalls.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "impact-case-study": {
				const items = await db.query.impactCaseStudies.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "news-item": {
				const items = await db.query.news.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "opportunity": {
				const items = await db.query.opportunities.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "page": {
				const items = await db.query.pages.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "person": {
				const items = await db.query.persons.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "project": {
				const items = await db.query.dariahProjects.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "spotlight-article": {
				const items = await db.query.spotlightArticles.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case "working-group": {
				const items = await db.query.workingGroups.findMany({
					where: {
						entityVersion: {
							status: {
								type: "published",
							},
						},
					},
					columns: { id: true },
				});

				return toEntityIds(items.map((item) => item.id));
			}

			case undefined: {
				const groups = await Promise.all(
					supportedWebsiteEntityTypes.map((type) => getSyncableWebsiteEntityIdsByType(type)),
				);

				return groups.flat();
			}
		}
	}

	/**
	 * Every document a knowledge-base document (entity) currently warrants. Usually one, but a
	 * country-scoped unit has one per country it belongs to, and an entity that is unpublished or not
	 * indexable has none.
	 */
	async function getWebsiteDocumentsForEntity(
		entityId: string,
		params?: { importedAt?: number },
	): Promise<Array<WebsiteEntityDocument>> {
		const importedAt = params?.importedAt ?? Date.now();
		const descriptor = await getWebsiteDocumentDescriptorByEntityId(entityId);

		if (descriptor == null) {
			return [];
		}

		switch (descriptor.type) {
			case "institution":
			case "national-consortium": {
				const documentsById = new Map<string, WebsiteEntityDocument>();

				const groups = await Promise.all(
					countryScopedUnitQueries
						.filter((query) => query.type === descriptor.type)
						.map(async (query) => {
							const items = await getCountryScopedUnits(db, { ...query.params, entityId });

							return { items, type: query.type };
						}),
				);

				const descriptions = await getPlainTextFieldContentByVersionId(
					db,
					groups.flatMap(({ items }) => items.map((item) => item.versionId)),
					"description",
				);

				for (const { items, type } of groups) {
					for (const item of items) {
						const document = createWebsiteEntityDocument({
							entityId,
							importedAt,
							type,
							sourceId: item.itemSlug,
							documentId: `${item.countrySlug}:${item.itemSlug}`,
							sourceUpdatedAt: item.sourceUpdatedAt,
							label: item.label,
							description: mergeDescription(
								descriptions.get(item.versionId),
								item.description ?? "",
							),
							link: getEntityHref({ type: "country", slug: item.countrySlug }),
						});

						// A unit can be both a partner and a cooperating partner institution of the ERIC;
						// that is still one document per country.
						documentsById.set(document.id, document);
					}
				}

				return [...documentsById.values()];
			}

			case "country": {
				const item = await db.query.membersAndPartners.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const descriptions = await getPlainTextFieldContentByVersionId(
					db,
					[item.id],
					"description",
				);

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "country",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.name,
						description: mergeDescription(descriptions.get(item.id), item.summary ?? ""),
						link: getEntityHref({ type: "country", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "document-or-policy": {
				const item = await db.query.documentsPolicies.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "document-or-policy",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.title,
						description: item.summary ?? "",
						link: getEntityHref({ type: "document-or-policy" }),
					}),
				];
			}

			case "event": {
				const item = await db.query.events.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						duration: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "event",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.duration.start,
						label: item.title,
						description: item.summary,
						link: getEntityHref({ type: "event", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "funding-call": {
				const item = await db.query.fundingCalls.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "funding-call",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.title,
						description: item.summary ?? "",
						link: getEntityHref({ type: "funding-call", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "impact-case-study": {
				const item = await db.query.impactCaseStudies.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						publicationDate: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "impact-case-study",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.publicationDate,
						label: item.title,
						description: item.summary,
						link: getEntityHref({
							type: "impact-case-study",
							slug: item.entityVersion.entity.slug,
						}),
					}),
				];
			}

			case "news-item": {
				const item = await db.query.news.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						publicationDate: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const content = await getPlainTextFieldContentByVersionId(db, [item.id], "content");

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "news-item",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.publicationDate,
						label: item.title,
						description: mergeDescription(content.get(item.id), item.summary),
						link: getEntityHref({ type: "news-item", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "opportunity": {
				const item = await db.query.opportunities.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						publicationDate: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const content = await getPlainTextFieldContentByVersionId(db, [item.id], "content");

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "opportunity",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.title,
						description: mergeDescription(content.get(item.id), item.summary ?? ""),
						link: getEntityHref({ type: "opportunity", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "page": {
				const item = await db.query.pages.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						publicationDate: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				// Interim: a page's real pathname is not yet stored in the CMS. Skip pages with no
				// mapped website route so we never index a link that would 404. Remove once pages
				// own a `path` column (docs/website-url-resolution.md).
				const path = resolveInterimPagePath(item.entityVersion.entity.slug);

				if (path == null) {
					return [];
				}

				const content = await getPlainTextFieldContentByVersionId(db, [item.id], "content");

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "page",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.publicationDate,
						label: item.title,
						description: mergeDescription(content.get(item.id), item.summary),
						link: getEntityHref({ type: "page", path }),
					}),
				];
			}

			case "person": {
				const item = await db.query.persons.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						name: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const biographies = await getPlainTextFieldContentByVersionId(db, [item.id], "biography");

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "person",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.name,
						description: biographies.get(item.id) ?? "",
						link: getEntityHref({ type: "person", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "project": {
				const item = await db.query.dariahProjects.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const descriptions = await getPlainTextFieldContentByVersionId(
					db,
					[item.id],
					"description",
				);

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "project",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.name,
						description: mergeDescription(descriptions.get(item.id), item.summary ?? ""),
						link: getEntityHref({ type: "project", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "spotlight-article": {
				const item = await db.query.spotlightArticles.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						publicationDate: true,
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const content = await getPlainTextFieldContentByVersionId(db, [item.id], "content");

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "spotlight-article",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.publicationDate,
						label: item.title,
						description: mergeDescription(content.get(item.id), item.summary),
						link: getEntityHref({
							type: "spotlight-article",
							slug: item.entityVersion.entity.slug,
						}),
					}),
				];
			}

			case "working-group": {
				const item = await db.query.workingGroups.findFirst({
					where: {
						entityVersion: {
							entityId,
							status: {
								type: "published",
							},
						},
					},
					columns: {
						id: true,
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const descriptions = await getPlainTextFieldContentByVersionId(
					db,
					[item.id],
					"description",
				);

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "working-group",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.name,
						description: mergeDescription(descriptions.get(item.id), item.summary ?? ""),
						link: getEntityHref({ type: "working-group", slug: item.entityVersion.entity.slug }),
					}),
				];
			}

			case "governance-body": {
				const item = await db.query.organisationalUnits.findFirst({
					where: {
						entityVersion: {
							entityId,
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
						summary: true,
						updatedAt: true,
					},
					with: {
						entityVersion: {
							columns: {},
							with: {
								entity: {
									columns: {
										slug: true,
									},
								},
							},
						},
					},
				});

				if (item == null) {
					return [];
				}

				const descriptions = await getPlainTextFieldContentByVersionId(
					db,
					[item.id],
					"description",
				);

				return [
					createWebsiteEntityDocument({
						entityId,
						importedAt,
						type: "governance-body",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.updatedAt,
						label: item.name,
						description: mergeDescription(descriptions.get(item.id), item.summary ?? ""),
						link: getEntityHref({
							type: "governance-body",
							slug: item.entityVersion.entity.slug,
						}),
					}),
				];
			}
		}
	}

	async function createWebsiteEntityDocuments(params?: {
		importedAt?: number;
	}): Promise<Array<WebsiteDocument>> {
		const importedAt = params?.importedAt ?? Date.now();
		const website: Array<WebsiteDocument> = [];

		const [
			countryDescriptions,
			newsContent,
			opportunityContent,
			pageContent,
			personBiographies,
			projectDescriptions,
			spotlightContent,
			workingGroupDescriptions,
		] = await Promise.all([
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.membersAndPartners.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"description",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.news.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"content",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.opportunities.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"content",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.pages.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"content",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.persons.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"biography",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.dariahProjects.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"description",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.spotlightArticles.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"content",
			),
			getPlainTextFieldContentByVersionId(
				db,
				(
					await db.query.workingGroups.findMany({
						columns: { id: true },
					})
				).map((item) => item.id),
				"description",
			),
		]);

		const documentsPolicies = await db.query.documentsPolicies.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...documentsPolicies.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "document-or-policy",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: getEntityHref({ type: "document-or-policy" }),
				}),
			),
		);

		const events = await db.query.events.findMany({
			columns: {
				id: true,
				duration: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...events.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "event",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.duration.start,
					label: item.title,
					description: item.summary,
					link: getEntityHref({ type: "event", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const fundingCalls = await db.query.fundingCalls.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...fundingCalls.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "funding-call",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: getEntityHref({ type: "funding-call", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const impactCaseStudies = await db.query.impactCaseStudies.findMany({
			columns: {
				id: true,
				publicationDate: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...impactCaseStudies.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "impact-case-study",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.publicationDate,
					label: item.title,
					description: item.summary,
					link: getEntityHref({ type: "impact-case-study", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const membersAndPartners = await db.query.membersAndPartners.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...membersAndPartners.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "country",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: mergeDescription(countryDescriptions.get(item.id), item.summary ?? ""),
					link: getEntityHref({ type: "country", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const organisationalUnitDescriptions = await getPlainTextFieldContentByVersionId(
			db,
			(
				await db.query.organisationalUnits.findMany({
					columns: { id: true },
				})
			).map((item) => item.id),
			"description",
		);

		// Units shown on a country page, indexed once per country. Same queries the per-entity sync
		// uses, so both paths always produce the same documents.
		const countryScopedDocumentsById = new Map<string, WebsiteEntityDocument>();

		for (const { params: queryParams, type } of countryScopedUnitQueries) {
			const items = await getCountryScopedUnits(db, queryParams);

			for (const item of items) {
				const document = createWebsiteEntityDocument({
					importedAt,
					type,
					entityId: item.entityId,
					sourceId: item.itemSlug,
					documentId: `${item.countrySlug}:${item.itemSlug}`,
					sourceUpdatedAt: item.sourceUpdatedAt,
					label: item.label,
					description: mergeDescription(
						organisationalUnitDescriptions.get(item.versionId),
						item.description ?? "",
					),
					link: getEntityHref({ type: "country", slug: item.countrySlug }),
				});

				countryScopedDocumentsById.set(document.id, document);
			}
		}

		website.push(...countryScopedDocumentsById.values());

		const news = await db.query.news.findMany({
			columns: {
				id: true,
				publicationDate: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...news.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "news-item",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.publicationDate,
					label: item.title,
					description: mergeDescription(newsContent.get(item.id), item.summary),
					link: getEntityHref({ type: "news-item", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const opportunities = await db.query.opportunities.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...opportunities.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "opportunity",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: mergeDescription(opportunityContent.get(item.id), item.summary ?? ""),
					link: getEntityHref({ type: "opportunity", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const pages = await db.query.pages.findMany({
			columns: {
				id: true,
				publicationDate: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			// Interim: skip pages whose slug has no mapped website route (they would 404). Remove
			// once pages own a `path` column (docs/website-url-resolution.md).
			...pages.flatMap((item) => {
				const path = resolveInterimPagePath(item.entityVersion.entity.slug);

				if (path == null) {
					return [];
				}

				return [
					createWebsiteEntityDocument({
						importedAt,
						entityId: item.entityVersion.entityId,
						type: "page",
						sourceId: item.entityVersion.entity.slug,
						sourceUpdatedAt: item.publicationDate,
						label: item.title,
						description: mergeDescription(pageContent.get(item.id), item.summary),
						link: getEntityHref({ type: "page", path }),
					}),
				];
			}),
		);

		const persons = await db.query.persons.findMany({
			columns: {
				id: true,
				name: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...persons.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "person",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: personBiographies.get(item.id) ?? "",
					link: getEntityHref({ type: "person", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const dariahProjects = await db.query.dariahProjects.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...dariahProjects.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "project",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: mergeDescription(projectDescriptions.get(item.id), item.summary ?? ""),
					link: getEntityHref({ type: "project", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const spotlightArticles = await db.query.spotlightArticles.findMany({
			columns: {
				id: true,
				publicationDate: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...spotlightArticles.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "spotlight-article",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.publicationDate,
					label: item.title,
					description: mergeDescription(spotlightContent.get(item.id), item.summary),
					link: getEntityHref({ type: "spotlight-article", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const workingGroups = await db.query.workingGroups.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...workingGroups.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "working-group",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: mergeDescription(workingGroupDescriptions.get(item.id), item.summary ?? ""),
					link: getEntityHref({ type: "working-group", slug: item.entityVersion.entity.slug }),
				}),
			),
		);

		const governanceBodies = await db.query.organisationalUnits.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
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
			with: {
				entityVersion: {
					columns: { entityId: true },
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				},
			},
		});

		website.push(
			...governanceBodies.map((item) =>
				createWebsiteEntityDocument({
					importedAt,
					entityId: item.entityVersion.entityId,
					type: "governance-body",
					sourceId: item.entityVersion.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: mergeDescription(
						organisationalUnitDescriptions.get(item.id),
						item.summary ?? "",
					),
					link: getEntityHref({
						type: "governance-body",
						slug: item.entityVersion.entity.slug,
					}),
				}),
			),
		);

		return website;
	}

	async function syncWebsiteSearchIndex(): Promise<SyncWebsiteSearchIndexResult> {
		const documents = await createWebsiteEntityDocuments();
		const result = await search.collections.website.ingest(documents);

		if (result.isErr()) {
			throw result.error;
		}

		const currentDocumentIds = new Set(documents.map((document) => document.id));

		const existingDocumentIds = new Set<string>();
		let page = 1;
		let totalPages;

		do {
			const result = await searchService.collections.website.search({
				filterBy: "source:=dariah-knowledge-base",
				page,
				perPage: 250,
				query: "*",
			});

			if (result.isErr()) {
				throw result.error;
			}

			for (const item of result.value.items) {
				existingDocumentIds.add(item.document.id);
			}

			totalPages = result.value.pagination.totalPages;
			page += 1;
		} while (page <= totalPages);

		let failedCount = 0;

		for (const documentId of existingDocumentIds) {
			if (currentDocumentIds.has(documentId)) {
				continue;
			}

			const result = await search.collections.website.delete(documentId);

			if (result.isErr() && !isMissingSearchDocumentError(result.error)) {
				log.error("Failed to delete stale website search document.", {
					documentId,
					error: result.error,
				});

				failedCount += 1;
			}
		}

		return {
			count: documents.length,
			failedCount,
		};
	}

	/**
	 * The ids of the documents currently indexed for an entity. An entity may own more than one, and
	 * a document whose source relation was removed can no longer be derived from the database — so
	 * this asks the index itself.
	 */
	async function getIndexedDocumentIdsForEntity(entityId: string): Promise<Array<string>> {
		const documentIds = new Set<string>();

		let page = 1;
		let totalPages;

		do {
			const result = await searchService.collections.website.search({
				filterBy: `entity_id:=${entityId}`,
				page,
				perPage: 250,
				query: "*",
			});

			if (result.isErr()) {
				throw result.error;
			}

			for (const item of result.value.items) {
				documentIds.add(item.document.id);
			}

			totalPages = result.value.pagination.totalPages;
			page += 1;
		} while (page <= totalPages);

		return [...documentIds];
	}

	async function deleteDocumentIds(documentIds: Array<string>): Promise<Array<unknown>> {
		const errors: Array<unknown> = [];

		for (const documentId of documentIds) {
			const result = await search.collections.website.delete(documentId);

			if (result.isErr() && !isMissingSearchDocumentError(result.error)) {
				log.error("Failed to delete website search document.", {
					documentId,
					error: result.error,
				});

				errors.push(result.error);
			}
		}

		return errors;
	}

	/**
	 * Removes every document belonging to an entity. Takes a descriptor rather than an entity id
	 * because it is called after the entity row is already gone.
	 */
	async function deleteWebsiteDocument(
		descriptor: WebsiteDocumentDescriptor,
	): Promise<SyncWebsiteDocumentResult> {
		const { entityId } = descriptor;

		// The derived id covers documents indexed before `entity_id` existed, and documents left
		// behind by a slug change, where the descriptor holds the previous slug.
		const documentIds = [
			...new Set([
				createWebsiteDocumentId(descriptor),
				...(await getIndexedDocumentIdsForEntity(entityId)),
			]),
		];

		const errors = await deleteDocumentIds(documentIds);

		return {
			entityId,
			upsertedDocumentIds: [],
			deletedDocumentIds: documentIds,
			...(errors.length > 0 ? { errors } : {}),
			ok: errors.length === 0,
			operation: "deleted",
		};
	}

	async function syncWebsiteDocumentForEntity(entityId: string): Promise<void> {
		await syncWebsiteDocumentForEntityWithResult(entityId);
	}

	/**
	 * Entity ids of the units indexed under a country. A country's own document is not the only one
	 * that changes when it is published or unpublished: the institutions and national consortia shown
	 * on its page link to it and disappear with it.
	 */
	async function getCountryScopedUnitEntityIds(countryEntityId: string): Promise<Array<string>> {
		const rows = await db
			.select({ entityId: schema.organisationalUnitsRelations.unitDocumentId })
			.from(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, countryEntityId));

		return [...new Set(rows.map((row) => row.entityId))];
	}

	async function syncWebsiteDocumentForEntityWithResult(
		entityId: string,
		params?: { cascade?: boolean },
	): Promise<SyncWebsiteDocumentResult> {
		const descriptor = await getWebsiteDocumentDescriptorByEntityId(entityId);

		if (descriptor == null) {
			return {
				entityId,
				upsertedDocumentIds: [],
				deletedDocumentIds: [],
				ok: true,
				operation: "skipped",
			};
		}

		const documents = await getWebsiteDocumentsForEntity(entityId);
		const documentIds = new Set(documents.map((document) => document.id));

		// Prune what the entity no longer warrants: it was unpublished, or it lost the relation that
		// put it on a country page. The derived id is included when nothing is left, to also catch
		// documents indexed before `entity_id` existed.
		const staleDocumentIds = [
			...new Set([
				...(await getIndexedDocumentIdsForEntity(entityId)),
				...(documents.length === 0 ? [createWebsiteDocumentId(descriptor)] : []),
			]),
		].filter((documentId) => !documentIds.has(documentId));

		const errors: Array<unknown> = [];

		for (const document of documents) {
			const result = await search.collections.website.upsert(document);

			if (result.isErr()) {
				log.error("Failed to upsert website search document.", {
					entityId,
					documentId: document.id,
					error: result.error,
				});

				errors.push(result.error);
			}
		}

		errors.push(...(await deleteDocumentIds(staleDocumentIds)));

		const cascaded =
			descriptor.type === "country" && params?.cascade !== false
				? await Promise.all(
						(await getCountryScopedUnitEntityIds(entityId)).map((unitEntityId) =>
							syncWebsiteDocumentForEntityWithResult(unitEntityId, { cascade: false }),
						),
					)
				: [];

		return {
			entityId,
			upsertedDocumentIds: [
				...documentIds,
				...cascaded.flatMap((result) => result.upsertedDocumentIds),
			],
			deletedDocumentIds: [
				...staleDocumentIds,
				...cascaded.flatMap((result) => result.deletedDocumentIds),
			],
			...(errors.length > 0 ? { errors } : {}),
			ok: errors.length === 0 && cascaded.every((result) => result.ok),
			operation: documents.length === 0 ? "deleted" : "synced",
		};
	}

	return {
		createWebsiteEntityDocuments,
		deleteWebsiteDocument,
		getSyncableWebsiteEntityIds,
		getSyncableWebsiteEntityIdsByType,
		getWebsiteDocumentDescriptorByEntityId,
		getWebsiteDocumentsForEntity,
		supportedWebsiteEntityTypes,
		syncWebsiteDocumentForEntity,
		syncWebsiteDocumentForEntityWithResult,
		syncWebsiteSearchIndex,
	};
}
